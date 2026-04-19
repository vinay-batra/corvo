import { NextRequest } from "next/server";

const SYSTEM = `You are a helpful assistant for Corvo, a free portfolio analytics tool at corvo.capital. Answer questions about Corvo features, investing concepts, portfolio analysis, Sharpe ratio, Monte Carlo simulation, and general finance. Be concise and friendly. No em dashes. No asterisks.`;

export async function POST(req: NextRequest) {
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
