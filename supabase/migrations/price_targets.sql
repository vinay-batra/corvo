-- Price Targets table
-- Stores user-defined price targets for their holdings
CREATE TABLE IF NOT EXISTS price_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    target_price NUMERIC(18, 6) NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
    notes TEXT,
    triggered BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE price_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own price targets"
    ON price_targets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS price_targets_user_idx       ON price_targets(user_id);
CREATE INDEX IF NOT EXISTS price_targets_triggered_idx  ON price_targets(triggered);
CREATE INDEX IF NOT EXISTS price_targets_ticker_idx     ON price_targets(ticker);
