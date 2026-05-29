import { NextRequest } from "next/server";

const SYSTEM = `You are a helpful assistant for Corvo, a free portfolio analytics tool at corvo.capital. Answer questions about Corvo features, investing concepts, portfolio analysis, Sharpe ratio, Monte Carlo simulation, and general finance. Be concise and friendly. No em dashes. No asterisks.`;

// In-memory per-IP rate limit. 5 messages per IP per 24-hour window.
// Resets on cold starts but provides solid protection against casual abuse.
// Cap to 2000 IPs to prevent unbounded memory growth.
const IP_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const _store = new Map<string, number[]>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
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

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (isRateLimited(ip)) {
    return Response.json(
      { content: "You've used all 5 free messages for today. Sign up free at corvo.capital to keep going." },
      { status: 429 }
    );
  }

  try {
    const { messages } = await req.json();
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
