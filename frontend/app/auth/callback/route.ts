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
      { auth: { persistSession: false, detectSessionInUrl: false } }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);
      const projectRef = "bkdjillyzyyysmkpvnos";
      const cookieName = `sb-${projectRef}-auth-token`;
      const sessionStr = JSON.stringify([
        data.session.access_token,
        data.session.refresh_token,
      ]);
      response.cookies.set(cookieName, sessionStr, {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      return response;
    }
    console.error("OAuth error:", error?.message);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
