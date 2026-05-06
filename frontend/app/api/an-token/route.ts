import { AgentClient } from "@21st-sdk/node"
import { NextResponse } from "next/server"

const client = new AgentClient({
  apiKey: process.env.API_KEY_21ST!,
})

export async function POST() {
  const token = await client.tokens.create({ agent: "my-agent" })
  return NextResponse.json(token)
}
