CREATE TABLE IF NOT EXISTS earnings_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL,
  summary jsonb,
  transcript_excerpt text,
  filing_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS earnings_summaries_ticker_idx ON earnings_summaries(ticker);
