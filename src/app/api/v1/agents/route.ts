import { fail, json } from "@/server/http";
import { store } from "@/server/store";

/** Every agent Chance Lite has judged, with how much it has learned. */
export async function GET() {
  try {
    const [judgments, lessons] = await Promise.all([store().listJudgments({ limit: 5000 }), store().listLessons()]);
    const map = new Map<string, { agent: string; judged: number; lessons: number; last_at: string }>();
    for (const j of judgments) {
      const a = map.get(j.agent) ?? { agent: j.agent, judged: 0, lessons: 0, last_at: j.created_at };
      a.judged++;
      if (j.created_at > a.last_at) a.last_at = j.created_at;
      map.set(j.agent, a);
    }
    for (const l of lessons) {
      if (!l.active) continue;
      const a = map.get(l.agent) ?? { agent: l.agent, judged: 0, lessons: 0, last_at: l.updated_at };
      a.lessons++;
      map.set(l.agent, a);
    }
    return json({ data: [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at)) });
  } catch (e) {
    return fail(e);
  }
}
