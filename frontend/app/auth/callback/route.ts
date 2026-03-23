import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: "pkce", persistSession: false } }
      );
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("exchangeCodeForSession error:", error.message, error.status);
        return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
      }
      
      if (data.session) {
        const response = NextResponse.redirect(`${origin}${next}`);
        const projectRef = "bkdjillyzyyysmkpvnos";
        const sessionStr = JSON.stringify([
          data.session.access_token,
          data.session.refresh_token,
        ]);
        response.cookies.set(`sb-${projectRef}-auth-token`, sessionStr, {
          httpOnly: false, secure: true, sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365, path: "/",
        });
        return response;
      }
    } catch (e: any) {
      console.error("Callback exception:", e.message);
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(e.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=no_code`);
}
