import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SYSTEM = `You are a helpful assistant for Corvo, a free portfolio analytics tool at corvo.capital. Answer questions about Corvo features, investing concepts, portfolio analysis, Sharpe ratio, Monte Carlo simulation, and general finance. Be concise and friendly. No em dashes. No asterisks.`;

// In-memory per-IP rate limit. 5 messages per IP per 24-hour window.
// Only applies to unauthenticated users — signed-in users are unlimited.
// Resets on cold starts but provides solid protection against casual abuse.
// Cap to 2000 IPs to prevent unbounded memory growth.
const IP_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const _store = new Map<string, number[]>();

// Message validation bounds. Caps input-token cost per request and rejects
// malformed shapes before they reach Anthropic.
const MAX_MESSAGES = 30;
const MAX_CHARS_PER_MSG = 8000;
const MAX_TOTAL_CHARS = 40000;

type ChatMsg = { role: "user" | "assistant"; content: string };

function validateMessages(input: unknown): ChatMsg[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) {
    return null;
  }
  let total = 0;
  const out: ChatMsg[] = [];
  for (const m of input) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.length === 0) return null;
    if (content.length > MAX_CHARS_PER_MSG) return null;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return null;
    out.push({ role, content });
  }
  return out;
}

function getIp(req: NextRequest): string {
  // On Vercel, x-vercel-forwarded-for is set by the edge to the real client IP
  // and cannot be overridden by the client. Raw X-Forwarded-For is
  // attacker-prependable from the LEFT, so if we must use it, take the
  // RIGHTMOST entry (the value Vercel's own proxy appended), never the leftmost.
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]; // rightmost = proxy-appended
  }
  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits = (_store.get(ip) || []).filter(t => t > cutoff);
  if (hits.length >= IP_LIMIT) {
    _store.set(ip, hits);
    return true;
  }
  hits.push(now);
  _store.set(ip, hits);
  if (_store.size > 2000) {
    _store.delete(_store.keys().next().value as string);
  }
  return false;
}

async function isSignedIn(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Signed-in users are unlimited on public AI chat
  const signedIn = await isSignedIn();

  if (!signedIn) {
    const ip = getIp(req);
    if (isRateLimited(ip)) {
      return Response.json(
        { content: "You've used all 5 free messages for today. Sign up for free to keep going." },
        { status: 429 }
      );
    }
  }

  try {
    const parsed = await req.json().catch(() => null);
    const messages = validateMessages(parsed?.messages);
    if (!messages) {
      return Response.json(
        { content: "Your message could not be processed. Please try again." },
        { status: 400 }
      );
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Response.json({ content: "AI chat is not configured on this deployment." });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM,
        messages,
      }),
    });

    const data = await r.json();
    return Response.json({ content: data.content?.[0]?.text ?? "Something went wrong." });
  } catch {
    return Response.json({ content: "Something went wrong. Please try again." }, { status: 500 });
  }
}
