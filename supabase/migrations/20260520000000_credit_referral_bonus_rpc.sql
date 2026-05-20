-- credit_referral_bonus: atomically credit a referrer when their referee
-- first triggers eligibility (e.g. first portfolio analysis).
--
-- The previous implementation was two REST PATCH calls from the backend:
--   1. UPDATE profiles SET bonus_messages_per_day = current + 5 WHERE id = referrer
--   2. UPDATE profiles SET referral_credited = TRUE WHERE id = referred_user
-- Two concurrent referral events for the same referrer would both read the
-- same current_bonus value and both write (current + 5), netting +5 instead
-- of +10 across the two referrals.
--
-- Pushing the whole flow into a single PL/pgSQL function makes the increment
-- a row-locked UPDATE that postgres serialises correctly. The function also
-- short-circuits self-referrals, already-credited users, and unknown
-- referral codes inside one transaction so the credit flag is never set
-- without the bonus actually landing.

CREATE OR REPLACE FUNCTION credit_referral_bonus(
  p_referred_user_id uuid,
  p_referrer_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referrer_id uuid;
  v_new_bonus int;
  v_claim_ok boolean;
BEGIN
  IF p_referrer_code IS NULL OR length(p_referrer_code) < 8 THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'invalid_code');
  END IF;

  -- Atomic claim: only the first concurrent caller for a given referred user
  -- succeeds. Subsequent callers see referral_credited = TRUE and the
  -- conditional excludes them.
  UPDATE profiles
  SET referral_credited = TRUE,
      updated_at = NOW()
  WHERE id = p_referred_user_id
    AND COALESCE(referral_credited, FALSE) = FALSE
  RETURNING TRUE INTO v_claim_ok;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_credited_or_not_found');
  END IF;

  -- Resolve referrer from 8-hex-char prefix of their UUID.
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE id::text ILIKE (substr(p_referrer_code, 1, 8) || '-%')
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    -- No referrer match; release the claim so the user could still be
    -- credited via a future valid code (e.g. they entered a typo).
    UPDATE profiles SET referral_credited = FALSE WHERE id = p_referred_user_id;
    RETURN jsonb_build_object('credited', false, 'reason', 'referrer_not_found');
  END IF;

  IF v_referrer_id = p_referred_user_id THEN
    -- Self-referral; release the claim.
    UPDATE profiles SET referral_credited = FALSE WHERE id = p_referred_user_id;
    RETURN jsonb_build_object('credited', false, 'reason', 'self_referral');
  END IF;

  -- Row-locked increment, capped at 25. Two concurrent referrals for the
  -- same referrer are serialised by postgres so each adds 5 cleanly.
  UPDATE profiles
  SET bonus_messages_per_day = LEAST(COALESCE(bonus_messages_per_day, 0) + 5, 25),
      updated_at = NOW()
  WHERE id = v_referrer_id
  RETURNING bonus_messages_per_day INTO v_new_bonus;

  RETURN jsonb_build_object(
    'credited', true,
    'referrer_id', v_referrer_id,
    'new_bonus', v_new_bonus
  );
END;
$$;

GRANT EXECUTE ON FUNCTION credit_referral_bonus(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
