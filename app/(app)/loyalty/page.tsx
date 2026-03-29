"use client";
import { useEffect, useState } from "react";
import { loyaltyApi, unwrap } from "@/lib/api";
import type { LoyaltyInfo } from "@/types";
import { fmtRelative } from "@/lib/utils";

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
const TIER_COLORS: Record<string, string> = {
  BRONZE: "#CD7F32", SILVER: "#C0C0C0", GOLD: "#FFD700",
  PLATINUM: "#E5E4E2", DIAMOND: "#B9F2FF",
};
const TIER_PTS: Record<string, number> = {
  BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, DIAMOND: 15000,
};
const TIER_PERKS: Record<string, string[]> = {
  BRONZE:   ["1x points multiplier", "Basic event access"],
  SILVER:   ["1.2x points multiplier", "Priority notifications", "Presale access"],
  GOLD:     ["1.5x points multiplier", "5% checkout discount", "Skip-the-queue"],
  PLATINUM: ["2x points multiplier", "10% discount", "Exclusive events", "Free transfer"],
  DIAMOND:  ["3x points multiplier", "15% discount", "All benefits", "Personal consultant"],
};

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
  imageUrl?: string;
  stock?: number;
}

export default function LoyaltyPage() {
  const [info, setInfo] = useState<LoyaltyInfo | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [tab, setTab] = useState<"rewards" | "history">("rewards");

  useEffect(() => {
    Promise.all([
      loyaltyApi.me().then((r) => setInfo(unwrap<LoyaltyInfo>(r))).catch(() => {}),
      loyaltyApi.rewards().then((r) => setRewards(unwrap<Reward[]>(r) ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function redeem(rewardId: string) {
    setRedeeming(rewardId);
    try {
      await loyaltyApi.redeem(rewardId);
      const r = await loyaltyApi.me();
      setInfo(unwrap<LoyaltyInfo>(r));
    } catch {}
    setRedeeming(null);
  }

  if (loading) return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="h-52 rounded-2xl animate-pulse bg-[var(--surface)]" />
      <div className="h-24 rounded-2xl animate-pulse bg-[var(--surface)]" />
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-40 rounded-2xl animate-pulse bg-[var(--surface)]" />)}
      </div>
    </div>
  );

  const tier = info?.tier ?? "BRONZE";
  const pts = info?.points ?? 0;
  const tierIdx = TIER_ORDER.indexOf(tier);
  const tierColor = TIER_COLORS[tier];
  const nextTier = TIER_ORDER[tierIdx + 1];
  const nextPts = nextTier ? TIER_PTS[nextTier] : null;
  const curPts = TIER_PTS[tier];
  const progress = nextPts
    ? Math.min(100, Math.round(((pts - curPts) / (nextPts - curPts)) * 100))
    : 100;

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Hero card */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${tierColor}22, ${tierColor}08)`, border: `1.5px solid ${tierColor}44` }}>
        {/* Decorative dots */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px", color: tierColor }} />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-1">Your Points</p>
              <p className="text-5xl font-black leading-none" style={{ color: tierColor }}>
                {pts.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm"
                style={{ background: tierColor + "33", color: tierColor }}>
                <span>★</span>
                <span>{tier}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1.5">Loyalty tier</p>
            </div>
          </div>

          {nextTier ? (
            <>
              <div className="flex justify-between text-xs text-[var(--muted)] mb-1.5">
                <span className="font-semibold" style={{ color: tierColor }}>{tier}</span>
                <span>{(nextPts! - pts).toLocaleString()} pts to {nextTier}</span>
              </div>
              <div className="h-2.5 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: tierColor }} />
              </div>
            </>
          ) : (
            <p className="text-sm font-bold" style={{ color: tierColor }}>🏆 Maximum tier reached!</p>
          )}
        </div>
      </div>

      {/* Tier ladder */}
      <div className="card p-4">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">Tier Ladder</p>
        <div className="flex gap-1.5">
          {TIER_ORDER.map((t, i) => {
            const unlocked = i <= tierIdx;
            const isCurrent = t === tier;
            const tc = TIER_COLORS[t];
            return (
              <div key={t} className="flex-1 rounded-xl p-2 text-center transition-all"
                style={{
                  background: unlocked ? tc + "22" : "var(--surface)",
                  border: isCurrent ? `2px solid ${tc}` : "2px solid transparent",
                  opacity: unlocked ? 1 : 0.35,
                }}>
                <div className="text-xs font-black" style={{ color: tc }}>★</div>
                <div className="text-[9px] font-bold mt-0.5" style={{ color: tc }}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </div>
                <div className="text-[8px] text-[var(--muted)] mt-0.5">
                  {TIER_PTS[t] === 0 ? "Start" : (TIER_PTS[t] / 1000).toFixed(0) + "k"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current tier perks */}
      <div className="card p-4">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">
          {tier} Tier Perks
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(TIER_PERKS[tier] ?? []).map((perk) => (
            <div key={perk} className="flex items-center gap-2 text-xs">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              <span className="text-[var(--text)]">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1">
        {(["rewards", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t ? "bg-[var(--card-bg)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
            }`}>
            {t === "rewards" ? "🎁 Rewards" : "📋 History"}
          </button>
        ))}
      </div>

      {tab === "rewards" && (
        rewards.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎁</div>
            <p className="font-bold text-[var(--text)] mb-1">No rewards yet</p>
            <p className="text-sm text-[var(--muted)]">Earn points by buying tickets</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((reward) => {
              const canAfford = pts >= reward.pointsCost;
              return (
                <div key={reward.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-24 bg-[var(--surface)] flex items-center justify-center text-4xl">
                    {reward.imageUrl
                      ? <img src={reward.imageUrl} alt="" className="w-full h-full object-cover" />
                      : "🎁"}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm line-clamp-1 text-[var(--text)]">{reward.name}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{reward.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-black text-[var(--primary)]">
                        {reward.pointsCost.toLocaleString()} pts
                      </span>
                      <button
                        onClick={() => redeem(reward.id)}
                        disabled={!canAfford || redeeming === reward.id}
                        className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                          canAfford
                            ? "bg-[var(--primary)] text-white hover:opacity-90"
                            : "bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed"
                        }`}>
                        {redeeming === reward.id ? "…" : canAfford ? "Redeem" : "Need pts"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "history" && (
        (!info?.recentHistory || info.recentHistory.length === 0) ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-bold text-[var(--text)] mb-1">No activity yet</p>
            <p className="text-sm text-[var(--muted)]">Points you earn will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {info.recentHistory.map((h) => (
              <div key={h.id} className="card p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  h.points >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}>
                  {h.points >= 0 ? "+" : "−"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {h.description || h.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{fmtRelative(h.createdAt)}</p>
                </div>
                <span className={`font-black text-sm flex-shrink-0 ${h.points >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {h.points >= 0 ? "+" : ""}{h.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
