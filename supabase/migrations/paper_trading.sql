CREATE TABLE IF NOT EXISTS paper_trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  action text NOT NULL CHECK (action IN ('buy', 'sell')),
  shares numeric NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  executed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paper_portfolio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  cash numeric DEFAULT 10000,
  positions jsonb DEFAULT '{}',
  starting_value numeric DEFAULT 10000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own paper trades" ON paper_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own paper portfolio" ON paper_portfolio FOR ALL USING (auth.uid() = user_id);
