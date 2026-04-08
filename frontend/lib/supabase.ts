import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: { maxAge: 60 * 60 * 24 * 30 }, // 30-day persistent session
});

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  assets: { ticker: string; weight: number }[];
  period: string;
  created_at: string;
};
