"use client";

function Skel({ w = "100%", h = 16, style = {} }: { w?: string | number; h?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: 6, ...style }} />;
}

export function MetricCardSkeleton() {
  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "16px 16px 14px", background: "var(--card-bg)" }}>
      <Skel w="55%" h={8} style={{ marginBottom: 14 }} />
      <Skel w="70%" h={28} style={{ marginBottom: 10 }} />
      <Skel w="100%" h={2} />
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", marginBottom: 12 }}>
      <Skel w="35%" h={9} style={{ marginBottom: 16 }} />
      <Skel w="100%" h={180} style={{ borderRadius: 8 }} />
    </div>
  );
}

export function SmallCardSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px 20px", background: "var(--card-bg)", height }}>
      <Skel w="45%" h={9} style={{ marginBottom: 14 }} />
      <Skel w="65%" h={20} style={{ marginBottom: 10 }} />
      <Skel w="100%" h={12} />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
      </div>
      <ChartCardSkeleton />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[0,1,2].map(i => <SmallCardSkeleton key={i} height={160} />)}
      </div>
    </div>
  );
}
