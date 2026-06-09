import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function safeNext(raw: string | null): string {
  // Must be a relative path rooted at a single "/", and not "//" or "/\" which
  // browsers treat as protocol-relative (open redirect). Reject everything else.
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/app";
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only gate-check onboarding when the destination is /app.
      // Never intercept navigations to /settings or other pages.
      if (next === "/app" || next === "/") {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const metaComplete = user.user_metadata?.onboarding_complete === true;

          if (!metaComplete) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", user.id)
              .single();

            if (!profile?.onboarding_completed) {
              // Safety: if the user already has saved portfolios they have
              // used the app before - do not redirect them to onboarding.
              const { count } = await supabase
                .from("portfolios")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id);

              if (!count || count === 0) {
                return NextResponse.redirect(`${origin}/onboarding`);
              }
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
