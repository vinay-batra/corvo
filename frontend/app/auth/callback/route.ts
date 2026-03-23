import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);
      // Set session cookies manually
      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: false, secure: true, sameSite: "lax", maxAge: data.session.expires_in,
      });
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: false, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }
    console.error("OAuth error:", error);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
