// Weighted buy-and-hold growth of a portfolio from its value anchor.
//
// When the user sets a portfolio value, we capture the per-ticker prices at
// that moment (the "anchor"). The live value is then the anchored dollar value
// scaled by the value-weighted growth of the holdings since the anchor:
//
//     liveValue = baseValue * Σ w_i (livePrice_i / anchorPrice_i)
//
// renormalised over whatever weight is covered by BOTH an anchor price and a
// live price. This tracks the market intraday and day-over-day (so it stays
// close to a real brokerage) without depending on the snapshot pipeline.
//
// Falls back to baseValue (tracked=false) when there's no anchor or fewer than
// half the weights are covered - so we never show a partial/garbage number.
export function liveValueFromAnchor(
  baseValue: number,
  assets: { ticker: string; weight: number }[],
  anchorPrices: Record<string, number> | null | undefined,
  livePrices: Record<string, number>,
): { value: number; tracked: boolean } {
  if (!(baseValue > 0)) return { value: baseValue, tracked: false };
  if (!anchorPrices) return { value: baseValue, tracked: false };
  const valid = assets.filter(a => a.ticker && a.weight > 0);
  const totalW = valid.reduce((s, a) => s + a.weight, 0);
  if (totalW <= 0) return { value: baseValue, tracked: false };
  let num = 0;
  let wsum = 0;
  for (const a of valid) {
    const ap = Number(anchorPrices[a.ticker.toUpperCase()]);
    const pn = livePrices[a.ticker.toUpperCase()];
    if (ap > 0 && pn != null && pn > 0) {
      num += a.weight * (pn / ap);
      wsum += a.weight;
    }
  }
  if (wsum <= 0 || wsum < 0.5 * totalW) return { value: baseValue, tracked: false };
  const growth = num / wsum;
  if (!Number.isFinite(growth) || growth <= 0) return { value: baseValue, tracked: false };
  return { value: baseValue * growth, tracked: true };
}
