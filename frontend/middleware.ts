import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Force-hardened cookie flags. supabase/ssr's defaults are
            // sane (Lax + httpOnly) but were not explicitly recorded in
            // code, so a future Supabase release could change them
            // without our review. Lax over Strict because the magic-link
            // and OAuth callback flows depend on cookies being sent on
            // top-level GET navigations from email clients and OAuth
            // providers; Strict would log the user out on that hop.
            // Lax still blocks cross-site POST CSRF, which is the actual
            // threat for our state-changing endpoints. secure=true
            // requires HTTPS in production; flagged true only when not
            // in dev so localhost still works.
            const hardened: CookieOptions = {
              ...(options ?? {}),
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: options?.path ?? "/",
            };
            supabaseResponse.cookies.set(name, value, hardened as Parameters<typeof supabaseResponse.cookies.set>[2]);
          });
        },
      },
    }
  );

  // Refresh the session if expired - writes updated cookies to supabaseResponse
  // so the browser and server stay in sync. Required by @supabase/ssr.
  // Wrapped in try/catch so a transient Supabase outage does not 500 the
  // whole site; the request continues with a stale (or anonymous) session and
  // the client retries on the next navigation.
  try {
    await supabase.auth.getUser();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[middleware] supabase.auth.getUser failed:", err);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
