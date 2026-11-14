import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import type { Judgment, Lesson, Rehearsal, Verdict } from "@/lib/types";

/**
 * Where judgments, lessons and rehearsals live. Postgres when DATABASE_URL is set (Railway); otherwise a JSON file
 * under CHANCE_LITE_DATA_DIR (default .data), so a fresh clone runs with no setup. Each record is stored whole as
 * JSON with the columns we filter on beside it, so both stores answer the same questions the same way.
 */

export interface JudgmentQuery { agent?: string; verdict?: Verdict; limit?: number; before?: string; rehearsal?: string }

export interface Store {
  kind: "postgres" | "file";
  insertJudgment(j: Judgment): Promise<void>;
  updateJudgment(j: Judgment): Promise<void>;
  getJudgment(id: string): Promise<Judgment | null>;
  listJudgments(q: JudgmentQuery): Promise<Judgment[]>;
  listLessons(agent?: string): Promise<Lesson[]>;
  saveLesson(l: Lesson): Promise<void>;
  clearAgent(agent: string): Promise<void>;
  saveRehearsal(r: Rehearsal): Promise<void>;
  getRehearsal(id: string): Promise<Rehearsal | null>;
  listRehearsals(limit?: number): Promise<Rehearsal[]>;
  /** Small settings: the NEAR agent id and grant token created through the owner flow. */
  getKv(key: string): Promise<string | null>;
  setKv(key: string, value: string): Promise<void>;
}

/* ── file ── */

interface FileData { judgments: Judgment[]; lessons: Lesson[]; rehearsals: Rehearsal[]; kv: Record<string, string> }

function fileStore(persist = true): Store {
  const dir = process.env.CHANCE_LITE_DATA_DIR || join(process.cwd(), ".data");
  const path = join(dir, "chance-lite.json");
  let data: FileData = { judgments: [], lessons: [], rehearsals: [], kv: {} };
  try {
    if (persist && existsSync(path)) data = { ...data, ...JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    /* a broken file starts over rather than taking the app down */
  }
  let timer: NodeJS.Timeout | null = null;
  const flush = () => {
    timer = null;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${path}.tmp`, JSON.stringify(data));
    renameSync(`${path}.tmp`, path);
  };
  const save = () => {
    if (persist && !timer) timer = setTimeout(flush, 150);
  };
  const byNewest = (a: { created_at?: string; started_at?: string }, b: { created_at?: string; started_at?: string }) =>
    (b.created_at ?? b.started_at ?? "").localeCompare(a.created_at ?? a.started_at ?? "");

  return {
    kind: "file",
    async insertJudgment(j) { data.judgments.push(j); save(); },
    async updateJudgment(j) { const i = data.judgments.findIndex((x) => x.id === j.id); if (i >= 0) data.judgments[i] = j; save(); },
    async getJudgment(id) { return data.judgments.find((x) => x.id === id) ?? null; },
    async listJudgments(q) {
      return data.judgments
        .filter((j) => (!q.agent || j.agent === q.agent) && (!q.verdict || j.verdict === q.verdict) && (!q.before || j.created_at < q.before) && (!q.rehearsal || j.rehearsal?.id === q.rehearsal))
        .sort(byNewest)
        .slice(0, q.limit ?? 50);
    },
    async listLessons(agent) { return data.lessons.filter((l) => !agent || l.agent === agent).sort((a, b) => b.hits + b.prevented - (a.hits + a.prevented)); },
    async saveLesson(l) { const i = data.lessons.findIndex((x) => x.id === l.id); if (i >= 0) data.lessons[i] = l; else data.lessons.push(l); save(); },
    async clearAgent(agent) {
      data.lessons = data.lessons.filter((l) => l.agent !== agent);
      data.judgments = data.judgments.filter((j) => j.agent !== agent);
      save();
    },
    async saveRehearsal(r) { const i = data.rehearsals.findIndex((x) => x.id === r.id); if (i >= 0) data.rehearsals[i] = r; else data.rehearsals.push(r); save(); },
    async getRehearsal(id) { return data.rehearsals.find((x) => x.id === id) ?? null; },
    async listRehearsals(limit = 20) { return [...data.rehearsals].sort(byNewest).slice(0, limit); },
    async getKv(key) { return data.kv[key] ?? null; },
    async setKv(key, value) { data.kv[key] = value; save(); },
  };
}

/* ── postgres ── */

function pgStore(url: string): Store {
  const sql = postgres(url, { max: 5, idle_timeout: 30, prepare: false, onnotice: () => {} });
  const ready = (async () => {
    await sql`create table if not exists judgments (
      id text primary key, agent text not null, verdict text not null, created_at timestamptz not null,
      rehearsal text, doc jsonb not null)`;
    await sql`create index if not exists judgments_agent_time on judgments (agent, created_at desc)`;
    await sql`create index if not exists judgments_time on judgments (created_at desc)`;
    await sql`create table if not exists lessons (
      id text primary key, agent text not null, key text not null, doc jsonb not null, unique (agent, key))`;
    await sql`create table if not exists rehearsals (id text primary key, started_at timestamptz not null, doc jsonb not null)`;
    await sql`create table if not exists kv (key text primary key, value text not null)`;
  })();
  const docs = <T,>(rows: readonly Record<string, unknown>[]) => rows.map((r) => r.doc as T);
  const json = (v: unknown) => sql.json(v as Parameters<typeof sql.json>[0]);

  return {
    kind: "postgres",
    async insertJudgment(j) {
      await ready;
      await sql`insert into judgments (id, agent, verdict, created_at, rehearsal, doc)
        values (${j.id}, ${j.agent}, ${j.verdict}, ${j.created_at}, ${j.rehearsal?.id ?? null}, ${json(j)})`;
    },
    async updateJudgment(j) {
      await ready;
      await sql`update judgments set verdict = ${j.verdict}, doc = ${json(j)} where id = ${j.id}`;
    },
    async getJudgment(id) {
      await ready;
      return docs<Judgment>(await sql`select doc from judgments where id = ${id}`)[0] ?? null;
    },
    async listJudgments(q) {
      await ready;
      const rows = await sql`select doc from judgments where true
        ${q.agent ? sql`and agent = ${q.agent}` : sql``}
        ${q.verdict ? sql`and verdict = ${q.verdict}` : sql``}
        ${q.before ? sql`and created_at < ${q.before}` : sql``}
        ${q.rehearsal ? sql`and rehearsal = ${q.rehearsal}` : sql``}
        order by created_at desc limit ${q.limit ?? 50}`;
      return docs<Judgment>(rows);
    },
    async listLessons(agent) {
      await ready;
      const rows = agent ? await sql`select doc from lessons where agent = ${agent}` : await sql`select doc from lessons`;
      return docs<Lesson>(rows).sort((a, b) => b.hits + b.prevented - (a.hits + a.prevented));
    },
    async saveLesson(l) {
      await ready;
      await sql`insert into lessons (id, agent, key, doc) values (${l.id}, ${l.agent}, ${l.key}, ${json(l)})
        on conflict (id) do update set doc = excluded.doc`;
    },
    async clearAgent(agent) {
      await ready;
      await sql`delete from lessons where agent = ${agent}`;
      await sql`delete from judgments where agent = ${agent}`;
    },
    async saveRehearsal(r) {
      await ready;
      await sql`insert into rehearsals (id, started_at, doc) values (${r.id}, ${r.started_at}, ${json(r)})
        on conflict (id) do update set doc = excluded.doc`;
    },
    async getRehearsal(id) {
      await ready;
      return docs<Rehearsal>(await sql`select doc from rehearsals where id = ${id}`)[0] ?? null;
    },
    async listRehearsals(limit = 20) {
      await ready;
      return docs<Rehearsal>(await sql`select doc from rehearsals order by started_at desc limit ${limit}`);
    },
    async getKv(key) {
      await ready;
      const rows = await sql`select value from kv where key = ${key}`;
      return (rows[0]?.value as string | undefined) ?? null;
    },
    async setKv(key, value) {
      await ready;
      await sql`insert into kv (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`;
    },
  };
}

/** One store per server process, kept on globalThis so dev reloads don't open a second one. */
export function store(): Store {
  const g = globalThis as unknown as { __chanceLiteStore?: Store };
  if (!g.__chanceLiteStore) g.__chanceLiteStore = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore();
  return g.__chanceLiteStore;
}

/** Tests get a store of their own that never touches disk or a database. */
export function memoryStore(): Store {
  return fileStore(false);
}
