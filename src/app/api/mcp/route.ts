import { judgeProposal, validateProposal } from "@/server/judge";
import { json, limited, origin } from "@/server/http";
import { renderPlaybook } from "@/server/lessons";
import { store } from "@/server/store";

/**
 * Chance Lite as an MCP server (streamable HTTP, stateless JSON responses). Claude Code:
 *   claude mcp add --transport http chance-lite https://<host>/api/mcp
 * Tools: check_action (judge one Agent API action before calling it) and get_playbook (the agent's lessons).
 */

const TOOLS = [
  {
    name: "check_action",
    description:
      "Call this before EVERY NEAR Intents Agent API swap, transfer, withdraw or limit order. Chance Lite judges the action against the user's own words and what you read (prompt injection), and answers ALLOW, BLOCK or ESCALATE with the lessons to apply. Only send the action to the Agent API on ALLOW.",
    inputSchema: {
      type: "object",
      required: ["agent", "intent", "action"],
      properties: {
        agent: { type: "string", description: "Your agent id, e.g. claude-code-trader. Lessons are kept per agent." },
        intent: { type: "string", description: "The user's request, verbatim." },
        action: {
          type: "object",
          required: ["type", "params"],
          properties: {
            type: { type: "string", enum: ["swap", "transfer", "withdraw", "limit_order"] },
            params: { type: "object", description: "The exact JSON body you would POST to the Agent API (atomic amounts)." },
          },
        },
        context: { type: "array", description: "What you read: [{role: user|tool|web|email, source, content}]", items: { type: "object" } },
        mandate: { type: "string", description: "The owner's standing rules, if any." },
        balances: { type: "object", description: "asset_id -> atomic balance, if known." },
        reasoning: { type: "string", description: "Why you propose it, one sentence." },
      },
    },
  },
  {
    name: "get_playbook",
    description: "Load your playbook: the lessons Chance Lite learned from your own blocked actions. Read it at the start of every session and follow it.",
    inputSchema: { type: "object", required: ["agent"], properties: { agent: { type: "string" } } },
  },
];

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

async function handle(m: Rpc, base: string): Promise<unknown> {
  switch (m.method) {
    case "initialize":
      return {
        protocolVersion: (m.params?.protocolVersion as string) ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "chance-lite", version: "0.1.0" },
        instructions: "Before any NEAR Intents Agent API action, call check_action and act only on ALLOW. Load get_playbook at the start of each session.",
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const name = m.params?.name as string;
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      if (name === "get_playbook") {
        const agent = String(args.agent ?? "");
        const lessons = await store().listLessons(agent);
        return { content: [{ type: "text", text: renderPlaybook(agent, lessons, base) }] };
      }
      if (name === "check_action") {
        try {
          const r = await judgeProposal(validateProposal(args), { origin: base });
          const j = r.judgment;
          const lines = [`VERDICT: ${j.verdict}`, j.summary];
          if (j.verdict !== "ALLOW" && j.suggested) lines.push(`Instead: ${JSON.stringify(j.suggested)}`);
          if (r.lessons.length) lines.push("", "Lessons to apply:", ...r.lessons.slice(0, 5).map((l, i) => `${i + 1}. ${l.rule}`));
          lines.push("", `Verdict ${j.id}: ${base}/verdicts/${j.id}`);
          return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { verdict: j.verdict, id: j.id, summary: j.summary, lessons: r.lessons }, isError: false };
        } catch (e) {
          return { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true };
        }
      }
      throw Object.assign(new Error(`Unknown tool ${name}`), { code: -32602 });
    }
    default:
      throw Object.assign(new Error(`Method not found: ${m.method}`), { code: -32601 });
  }
}

export async function POST(req: Request) {
  const slow = limited(req, 60);
  if (slow) return slow;
  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const base = origin(req);
  const one = async (m: Rpc) => {
    if (m.id === undefined || m.id === null) {
      if (m.method?.startsWith("notifications/")) return null;
    }
    try {
      return { jsonrpc: "2.0", id: m.id ?? null, result: await handle(m, base) };
    } catch (e) {
      return { jsonrpc: "2.0", id: m.id ?? null, error: { code: (e as { code?: number }).code ?? -32603, message: e instanceof Error ? e.message : String(e) } };
    }
  };
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(one))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const out = await one(body);
  return out ? json(out) : new Response(null, { status: 202 });
}

export function GET() {
  return new Response("Chance Lite MCP: POST JSON-RPC here (streamable HTTP, JSON responses).", { status: 405, headers: { Allow: "POST" } });
}
