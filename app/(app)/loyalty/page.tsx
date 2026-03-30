"use client";
import { useEffect, useState } from "react";
import { loyaltyApi, unwrap } from "@/lib/api";
import type { LoyaltyInfo } from "@/types";
import { fmtRelative } from "@/lib/utils";

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

const TIER_META: Record<string, { color: string; bg: string; icon: string }> = {
  BRONZE:   { color: "#CD7F32", bg: "from-[#3d2200] via-[#5c3500] to-[#7a4700]", icon: "🥉" },
  SILVER:   { color: "#C0C0C0", bg: "from-[#1e1e1e] via-[#2e2e2e] to-[#3c3c3c]", icon: "🥈" },
  GOLD:     { color: "#FFD700", bg: "from-[#3d2e00] via-[#5c4500] to-[#7a5c00]", icon: "🥇" },
  PLATINUM: { color: "#E5E4E2", bg: "from-[#1a2a3a] via-[#1e3248] to-[#223a55]", icon: "💎" },
  DIAMOND:  { color: "#B9F2FF", bg: "from-[#001a2e] via-[#002a48] to-[#003860]", icon: "💠" },
};

const TIER_PTS: Record<string, number> = {
  BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, DIAMOND: 15000,
};

const TIER_PERKS: Record<string, string[]> = {
  BRONZE:   ["1× points on every ticket", "Basic event access"],
  SILVER:   ["1.2× points multiplier", "Priority notifications", "Presale access"],
  GOLD:     ["1.5× points multiplier", "5% checkout discount", "Skip-the-queue"],
  PLATINUM: ["2× points multiplier", "10% discount", "Exclusive events", "Free transfer"],
  DIAMOND:  ["3× points multiplier", "15% discount", "All benefits", "Personal consultant"],
};

const HOW_TO_EARN = [
  { icon: "🎟️", text: "Buy a ticket", pts: "+50 pts" },
  { icon: "👥", text: "Refer a friend", pts: "+100 pts" },
  { icon: "⭐", text: "Leave an event review", pts: "+25 pts" },
  { icon: "🔁", text: "Attend 3 events in a month", pts: "+200 pts" },
];

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
      <div className="h-52 rounded-3xl animate-pulse bg-[var(--surface)]" />
      <div className="h-24 rounded-2xl animate-pulse bg-[var(--surface)]" />
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-40 rounded-2xl animate-pulse bg-[var(--surface)]" />)}
      </div>
    </div>
  );

  const tier = info?.tier ?? "BRONZE";
  const pts = info?.points ?? 0;
  const tierIdx = TIER_ORDER.indexOf(tier);
  const meta = TIER_META[tier];
  const nextTier = TIER_ORDER[tierIdx + 1];
  const nextPts = nextTier ? TIER_PTS[nextTier] : null;
  const curPts = TIER_PTS[tier];
  const progress = nextPts
    ? Math.min(100, Math.round(((pts - curPts) / (nextPts - curPts)) * 100))
    : 100;

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Hero card — solid dark gradient so it's actually visible */}
      <div className={`rounded-3xl bg-gradient-to-br ${meta.bg} p-6 shadow-xl relative overflow-hidden`}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Loyalty Points</p>
              <p className="text-white text-5xl font-black leading-none tracking-tight">
                {pts.toLocaleString()}
              </p>
              <p className="text-white/40 text-xs mt-1">points earned</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm"
                style={{ background: meta.color + "33", color: meta.color, border: `1px solid ${meta.color}55` }}>
                <span>{meta.icon}</span>
                <span>{tier}</span>
              </div>
              <p className="text-white/40 text-xs mt-1.5">current tier</p>
            </div>
          </div>

          {nextTier ? (
            <>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold" style={{ color: meta.color }}>{tier}</span>
                <span className="text-white/60">{(nextPts! - pts).toLocaleString()} pts to {nextTier}</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: meta.color }} />
              </div>
              <p className="text-white/40 text-[10px] mt-1.5">
                {progress}% of the way to {nextTier} ({TIER_PTS[nextTier!].toLocaleString()} pts)
              </p>
            </>
          ) : (
            <p className="text-sm font-bold" style={{ color: meta.color }}>🏆 Maximum tier reached!</p>
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
            const tc = TIER_META[t].color;
            const tm = TIER_META[t];
            return (
              <div key={t} className="flex-1 rounded-xl p-2 text-center transition-all"
                style={{
                  background: unlocked ? tc + "22" : "var(--surface)",
                  border: isCurrent ? `2px solid ${tc}` : "2px solid transparent",
                  opacity: unlocked ? 1 : 0.4,
                }}>
                <div className="text-base leading-none">{tm.icon}</div>
                <div className="text-[9px] font-bold mt-0.5" style={{ color: unlocked ? tc : "var(--muted)" }}>
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
          {TIER_META[tier].icon} {tier} Tier Perks
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

      {/* How to earn — always shown, especially useful at 0 pts */}
      <div className="card p-4">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">How to Earn Points</p>
        <div className="space-y-2.5">
          {HOW_TO_EARN.map((item) => (
            <div key={item.text} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-sm text-[var(--text)]">{item.text}</span>
              </div>
              <span className="text-sm font-bold text-green-600">{item.pts}</span>
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
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">🎁</div>
            <p className="font-bold text-[var(--text)] mb-1">Rewards coming soon</p>
            <p className="text-sm text-[var(--muted)]">Earn points by buying tickets — redeem for discounts & exclusive perks</p>
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
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-bold text-[var(--text)] mb-1">No activity yet</p>
            <p className="text-sm text-[var(--muted)]">Buy tickets to start earning points</p>
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
