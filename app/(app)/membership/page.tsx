"use client";
import { useEffect, useState } from "react";
import { membershipApi, loyaltyApi, unwrap } from "@/lib/api";
import type { LoyaltyInfo } from "@/types";
import toast from "react-hot-toast";

interface MembershipPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  multiplier: number;
  tierMinimum: string;
}

interface MyMembership {
  plan: string;
  billingCycle: string;
  status: string;
  renewsAt?: string;
}

const PLAN_DEFAULTS: MembershipPlan[] = [
  {
    id: "FREE",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    multiplier: 1,
    tierMinimum: "BRONZE",
    features: [
      "1x points multiplier",
      "Bronze tier access",
      "Basic event discovery",
      "Standard checkout",
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    monthlyPrice: 500,
    annualPrice: 4800,
    multiplier: 1.2,
    tierMinimum: "SILVER",
    features: [
      "1.2x points multiplier",
      "Silver tier minimum",
      "Priority event notifications",
      "5% discount on platform fees",
      "Early access to presales",
    ],
  },
  {
    id: "VIP",
    name: "VIP",
    monthlyPrice: 1500,
    annualPrice: 14400,
    multiplier: 2,
    tierMinimum: "GOLD",
    features: [
      "2x points multiplier",
      "Gold tier minimum",
      "Everything in Premium",
      "10% discount on platform fees",
      "Free ticket transfers",
      "Exclusive VIP event invitations",
      "Personal event consultant",
    ],
  },
];

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#CD7F32",
  SILVER: "#C0C0C0",
  GOLD: "#FFD700",
  PLATINUM: "#E5E4E2",
  DIAMOND: "#B9F2FF",
};

function fmtKes(amount: unknown) {
  const n = Number(amount ?? 0);
  if (!n) return "Free";
  return `KES ${n.toLocaleString()}`;
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>(PLAN_DEFAULTS);
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  // Modal state
  const [upgradeTarget, setUpgradeTarget] = useState<MembershipPlan | null>(null);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);

  useEffect(() => {
    Promise.all([
      membershipApi.plans()
        .then((r) => {
          const data = unwrap<MembershipPlan[]>(r);
          if (Array.isArray(data) && data.length > 0) {
            // API may omit features array — merge with local defaults
            setPlans(data.map((p) => ({
              ...PLAN_DEFAULTS.find((d) => d.id === p.id),
              ...p,
              features: p.features?.length ? p.features : (PLAN_DEFAULTS.find((d) => d.id === p.id)?.features ?? []),
            })));
          }
        })
        .catch(() => {}),
      membershipApi.me()
        .then((r) => setMembership(unwrap<MyMembership>(r)))
        .catch(() => setMembership({ plan: "FREE", billingCycle: "monthly", status: "ACTIVE" })),
      loyaltyApi.me()
        .then((r) => setLoyalty(unwrap<LoyaltyInfo>(r)))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const currentPlan = membership?.plan ?? "FREE";

  async function subscribe() {
    if (!upgradeTarget) return;
    if (!phone.trim()) { toast.error("Enter your M-Pesa phone number"); return; }
    setSubmitting(true);
    try {
      await membershipApi.subscribe({
        plan: upgradeTarget.id,
        billingCycle: cycle,
        phone: phone.trim(),
      });
      setPaymentSent(true);
      toast.success("STK Push sent! Check your phone.");
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to initiate payment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setUpgradeTarget(null);
    setPhone("");
    setSubmitting(false);
    setPaymentSent(false);
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 animate-pulse bg-[var(--surface)] rounded-lg mb-6" />
        <div className="card p-6 mb-6 animate-pulse h-32" />
        <div className="grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Membership</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Unlock more points, discounts and exclusive access</p>

      {/* Current plan hero */}
      <div className="card p-6 mb-8 bg-gradient-to-br from-[#1a1a1a] to-[#2a1a1a]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider mb-1">Your Current Plan</p>
            <p className="text-3xl font-black text-white">{currentPlan}</p>
            {membership?.renewsAt && (
              <p className="text-xs text-[var(--muted)] mt-1">
                Renews {new Date(membership.renewsAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          {loyalty && (
            <div
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm"
              style={{
                background: (TIER_COLORS[loyalty.tier] ?? "#999") + "33",
                color: TIER_COLORS[loyalty.tier] ?? "#999",
              }}
            >
              <span className="text-base">★</span>
              <span>{loyalty.tier}</span>
            </div>
          )}
        </div>
        {loyalty && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-white font-black text-2xl">{loyalty.points.toLocaleString()}</span>
            <span className="text-[var(--muted)] text-sm">loyalty points</span>
          </div>
        )}
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center gap-1 bg-[var(--surface)] rounded-xl p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              cycle === "monthly" ? "bg-white text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              cycle === "annual" ? "bg-white text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const price = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const isUpgrade =
            ["FREE", "PREMIUM", "VIP"].indexOf(plan.id) >
            ["FREE", "PREMIUM", "VIP"].indexOf(currentPlan);

          return (
            <div
              key={plan.id ?? plan.name}
              className={`card p-6 flex flex-col transition-all ${
                isCurrent ? "border-2 border-[var(--primary)] shadow-lg" : "border border-[var(--border)]"
              } ${plan.id === "VIP" ? "relative overflow-hidden" : ""}`}
            >
              {plan.id === "VIP" && (
                <div className="absolute top-3 right-3 bg-[var(--primary)] text-white text-xs font-bold px-2 py-1 rounded-full">
                  Best Value
                </div>
              )}
              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-medium mb-1">{plan.name}</p>
                {price === 0 ? (
                  <p className="text-3xl font-black text-[var(--text)]">Free</p>
                ) : (
                  <div>
                    <span className="text-3xl font-black text-[var(--text)]">{fmtKes(price)}</span>
                    <span className="text-[var(--muted)] text-sm ml-1">/{cycle === "annual" ? "year" : "month"}</span>
                  </div>
                )}
                {cycle === "annual" && price > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    Save KES {(Number(plan.monthlyPrice ?? 0) * 12 - Number(plan.annualPrice ?? 0)).toLocaleString()} vs monthly
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {(plan.features ?? []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    <span className="text-[var(--text)]">{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl font-bold text-sm border-2 border-[var(--primary)] text-[var(--primary)] cursor-default"
                >
                  Current Plan
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => setUpgradeTarget(plan)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                >
                  Upgrade to {plan.name}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed"
                >
                  Downgrade
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ blurb */}
      <div className="card p-5 text-sm text-[var(--muted)]">
        <p className="font-semibold text-[var(--text)] mb-2">About membership billing</p>
        <p>Payments are processed via M-Pesa STK Push. Annual plans are billed once and save 20% compared to paying monthly. You can cancel at any time — your benefits continue until the end of your billing period.</p>
      </div>

      {/* Upgrade Modal */}
      {upgradeTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 px-4 pb-4 md:pb-0">
          <div className="bg-[var(--card-bg)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {paymentSent ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">📱</div>
                <h2 className="text-xl font-black mb-2">Check your phone</h2>
                <p className="text-[var(--muted)] text-sm mb-6">
                  An M-Pesa prompt was sent to <strong>{phone}</strong>. Enter your PIN to activate your {upgradeTarget.name} plan.
                </p>
                <button
                  onClick={closeModal}
                  className="btn-primary w-full py-3"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black mb-1">Upgrade to {upgradeTarget.name}</h2>
                <p className="text-[var(--muted)] text-sm mb-5">
                  {cycle === "annual"
                    ? `KES ${Number(upgradeTarget.annualPrice ?? 0).toLocaleString()}/year — billed once`
                    : `KES ${Number(upgradeTarget.monthlyPrice ?? 0).toLocaleString()}/month`}
                </p>
                <div className="mb-5">
                  <label className="block text-sm font-semibold mb-1.5">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    className="input-base w-full"
                    placeholder="e.g. 0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">We will send an STK push to this number</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl border border-[var(--border)] font-semibold text-sm text-[var(--muted)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={subscribe}
                    disabled={submitting || !phone.trim()}
                    className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Pay with M-Pesa"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
