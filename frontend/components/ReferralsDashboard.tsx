"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ReferralStats {
  referral_link: string;
  referral_code: string;
  referrals_count: number;
  bonus_messages: number;
}

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Space Mono, monospace", color: "var(--accent)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5, lineHeight: 1.4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, opacity: 0.6 }}>{sub}</div>}
    </div>
  );
}

const SECONDARY_PLATFORMS = [
  {
    name: "Reddit",
    color: "#FF4500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    color: "#0A66C2",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    color: "#25D366",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    color: "#1877F2",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    color: "#E1306C",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    color: "var(--text)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.06-.1z" />
      </svg>
    ),
  },
];

export default function ReferralsDashboard() {
  const [refLink, setRefLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const code = user.id.replace(/-/g, "").slice(0, 8);
      setRefLink(`https://corvo.capital/app?ref=${code}`);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/referrals?user_id=${user.id}`);
        if (res.ok) {
          const data: ReferralStats = await res.json();
          setStats(data);
          if (data.referral_link) setRefLink(data.referral_link);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const shareText = `Just ran my portfolio through Corvo and learned more about my risk in 5 minutes than I have in years. Free, no BS: ${refLink}`;

  const referralCount = stats?.referrals_count ?? 0;
  const bonusEarned = stats?.bonus_messages ?? 0;
  const maxBonus = 40;
  const isCapped = bonusEarned >= maxBonus;
  const progressPct = Math.min((bonusEarned / maxBonus) * 100, 100);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text3)", fontSize: 13, padding: "16px 0" }}>
        <style>{`@keyframes ref-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "ref-spin 0.8s linear infinite" }} />
        Loading referral data...
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes ref-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Reward incentive card */}
      <div style={{ marginBottom: 20, padding: "16px 18px", background: "rgba(var(--accent-rgb), 0.05)", border: "0.5px solid rgba(var(--accent-rgb), 0.2)", borderRadius: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>Invite friends, earn rewards</div>
        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65, marginBottom: 12 }}>
          Each friend who signs up using your link unlocks +5 bonus AI messages per day. Refer 8 friends and keep the full +40 bonus permanently.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(var(--accent-rgb), 0.06)", border: "0.5px solid rgba(var(--accent-rgb), 0.15)", borderRadius: 8, textAlign: "center" as const }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Mono, monospace", color: "var(--accent)" }}>+5</div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>messages per referral</div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(var(--accent-rgb), 0.06)", border: "0.5px solid rgba(var(--accent-rgb), 0.15)", borderRadius: 8, textAlign: "center" as const }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Space Mono, monospace", color: "var(--accent)" }}>+1 mo</div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>Pro free when referral upgrades</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <StatCard value={referralCount} label="Friends referred" />
        <StatCard value={`+${bonusEarned}`} label="Bonus messages" sub="of 40 max" />
        <StatCard value="0" label="Pro upgrades" sub="coming soon" />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            {isCapped ? "Maximum bonus reached" : referralCount === 0 ? "Refer your first friend to start earning" : `${referralCount} referred - next referral adds +5 more`}
          </span>
          <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: "var(--text3)" }}>{bonusEarned}/{maxBonus}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: isCapped ? "#5cb88a" : "var(--accent)", borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
      </div>

      {/* Referral link */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 10, paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
          Your Referral Link
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "9px 12px", fontSize: 12, fontFamily: "Space Mono, monospace", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {refLink || "Loading..."}
          </div>
          <button
            onClick={copyLink}
            disabled={!refLink}
            style={{ padding: "9px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: linkCopied ? "#5cb88a" : "var(--accent)", color: "var(--bg)", cursor: refLink ? "pointer" : "not-allowed", transition: "background 0.2s", whiteSpace: "nowrap" as const, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            {linkCopied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : "Copy link"}
          </button>
        </div>
      </div>

      {/* Primary share actions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: 2.5, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 10, paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
          Share
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 14px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", textDecoration: "none", fontSize: 12, fontWeight: 500, transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border2)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("You should check out Corvo")}&body=${encodeURIComponent(shareText)}`}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 14px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", textDecoration: "none", fontSize: 12, fontWeight: 500, transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border2)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" />
            </svg>
            Send via email
          </a>
        </div>
      </div>

      {/* More platforms toggle */}
      <div>
        <button
          onClick={() => setShowMore(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "0 0 10px", fontSize: 11, color: "var(--text3)", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showMore ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {showMore ? "Hide other platforms" : "More platforms"}
        </button>

        {showMore && (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
            {SECONDARY_PLATFORMS.map(p => (
              <button
                key={p.name}
                onClick={() => {
                  const msg = shareText;
                  if (p.name === "Reddit") {
                    window.open(`https://reddit.com/submit?url=${encodeURIComponent(refLink)}&title=${encodeURIComponent("I learned more about my portfolio risk in 5 minutes than I have in years - free tool")}`, "_blank", "noopener");
                  } else if (p.name === "LinkedIn") {
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`, "_blank", "noopener");
                  } else if (p.name === "WhatsApp") {
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
                  } else if (p.name === "Facebook") {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`, "_blank", "noopener");
                  } else {
                    navigator.clipboard.writeText(refLink).then(() => showToast(`Link copied - paste it in ${p.name}`)).catch(() => {});
                  }
                }}
                title={p.name}
                style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5, padding: "9px 13px", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 9, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border2)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <span style={{ color: p.color, display: "flex", alignItems: "center" }}>{p.icon}</span>
                <span style={{ fontSize: 9, letterSpacing: 0.3, color: "var(--text3)", whiteSpace: "nowrap" as const }}>{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--card-bg)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "10px 18px", fontSize: 13, color: "var(--text)", zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", whiteSpace: "nowrap" as const }}>
          {toast}
        </div>
      )}
    </>
  );
}
