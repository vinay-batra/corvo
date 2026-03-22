import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Portfolio = {
  id: string
  user_id: string
  name: string
  assets: { ticker: string; weight: number }[]
  period: string
  created_at: string
}
