"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizerApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtCurrency, fmtDateTime, fmtRelative } from "@/lib/utils";
import type { User } from "@/types";
import toast from "react-hot-toast";

interface WalletData {
  grossRevenue: number;
  platformFees: number;
  netEarnings: number;
  paidOut: number;
  inProgress: number;
  availableToWithdraw: number;
  currency: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  phone: string;
  mpesaRef?: string;
  notes?: string;
  requestedAt: string;
  processedAt?: string;
}

const PAYOUT_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  REJECTED: "bg-red-100 text-red-600",
  CANCELLED: "bg-[var(--surface)] text-[var(--muted)]",
};

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 animate-pulse bg-[var(--surface)] rounded-lg" />
      <div className="animate-pulse h-44 rounded-2xl bg-[var(--surface)]" />
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-24" />)}
      </div>
    </div>
  );
}

export default function OrganizerWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdraw form
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState(false);

  // Payout settings
  const [settingsPhone, setSettingsPhone] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [walletRes, payoutsRes] = await Promise.all([
        organizerApi.wallet(),
        organizerApi.payouts({ limit: 10 }),
      ]);
      setWallet(unwrap<WalletData>(walletRes));
      const pd = unwrap<{ items: Payout[] } | Payout[]>(payoutsRes);
      setPayouts(Array.isArray(pd) ? pd : pd.items ?? []);
    } catch {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (!["ORGANIZER","ORGANIZER","ADMIN","SUPER_ADMIN"].includes(user.role)) {
      router.replace("/");
      return;
    }
    load();
  }, [router]);

  async function requestPayout() {
    const amt = Number(amount);
    if (!amt || amt < 100) { toast.error("Minimum withdrawal is KES 100"); return; }
    if (!phone.trim()) { toast.error("Enter your M-Pesa phone number"); return; }
    if (amt > (wallet?.availableToWithdraw ?? 0)) { toast.error("Amount exceeds available balance"); return; }

    setRequesting(true);
    try {
      await organizerApi.requestPayout({ amount: amt, phone: phone.trim(), notes: notes.trim() || undefined });
      toast.success("Payout request submitted! Admin will approve within 1 business day.");
      setShowForm(false);
      setAmount(""); setPhone(""); setNotes("");
      load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to request payout"
      );
    } finally {
      setRequesting(false);
    }
  }

  async function saveSettings() {
    if (!settingsPhone.trim()) { toast.error("Enter your M-Pesa phone number"); return; }
    setSavingSettings(true);
    try {
      await organizerApi.updatePayoutSettings({ mpesaPhone: settingsPhone.trim() });
      toast.success("Payout settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) return <Skeleton />;

  const available = wallet?.availableToWithdraw ?? 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-4">
        <Link href="/organizer" className="hover:text-[var(--text)]">Dashboard</Link>
        <span>/</span>
        <span className="text-[var(--text)] font-medium">My Wallet</span>
      </div>

      <h1 className="text-3xl font-black mb-1">My Wallet</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Your earnings from ticket sales</p>

      {/* Hero balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#D93B2F] to-[#8a1f16] p-6 text-white shadow-lg mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-white/70">Available to Withdraw</p>
            <p className="mt-1 text-5xl font-black leading-none">{fmtCurrency(available)}</p>
            <p className="mt-1.5 text-sm text-white/60">KES</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <span className="text-3xl">💰</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={available < 100 || showForm}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#D93B2F] transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↓ Withdraw Funds
        </button>
      </div>

      {/* Breakdown stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "Gross Ticket Sales", value: fmtCurrency(wallet?.grossRevenue ?? 0), icon: "📈", color: "bg-green-50" },
          { label: "Platform Fee (5%)", value: `−${fmtCurrency(wallet?.platformFees ?? 0)}`, icon: "⚙️", color: "bg-orange-50" },
          { label: "Already Paid Out", value: fmtCurrency(wallet?.paidOut ?? 0), icon: "✅", color: "bg-blue-50" },
          { label: "In Progress", value: fmtCurrency(wallet?.inProgress ?? 0), icon: "⏳", color: "bg-yellow-50" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-lg`}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Withdrawal form */}
      {showForm && (
        <div className="card p-6 mb-6 border-2 border-[var(--primary)]/30">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <span>↓</span> Request Withdrawal
          </h2>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 mb-4">
            Payouts are processed via M-Pesa B2C within 1 business day after admin approval. Minimum: KES 100.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Amount (KES) *</label>
              <input
                type="number"
                className="input-base"
                min={100}
                max={available}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={requesting}
              />
              <p className="text-xs text-[var(--muted)] mt-1">Available: {fmtCurrency(available)}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">M-Pesa Phone Number *</label>
              <input
                type="tel"
                className="input-base"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={requesting}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Notes (optional)</label>
              <input
                type="text"
                className="input-base"
                placeholder="e.g. Payment for Afro Fridays Vol. 14"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={requesting}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={requestPayout}
                disabled={requesting}
                className="btn-primary !py-3 flex-1 disabled:opacity-60"
              >
                {requesting ? "Submitting…" : "Submit Request"}
              </button>
              <button
                onClick={() => { setShowForm(false); setAmount(""); setPhone(""); setNotes(""); }}
                disabled={requesting}
                className="px-5 py-3 rounded-full border border-[var(--border)] text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout settings */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-base mb-4">Payout Settings</h2>
        <div>
          <label className="block text-sm font-semibold mb-1.5">M-Pesa Phone (for B2C payouts)</label>
          <div className="flex gap-3">
            <input
              type="tel"
              className="input-base flex-1"
              placeholder="e.g. 0712345678"
              value={settingsPhone}
              onChange={(e) => setSettingsPhone(e.target.value)}
              disabled={savingSettings}
            />
            <button
              onClick={saveSettings}
              disabled={savingSettings || !settingsPhone.trim()}
              className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
            >
              {savingSettings ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            This phone receives M-Pesa payments when admin approves your withdrawal requests.
          </p>
        </div>
      </div>

      {/* Payout history */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <span className="text-base">📋</span>
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted)]">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[var(--muted)] text-sm">No payout requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-start justify-between px-5 py-4 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{fmtCurrency(p.amount)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYOUT_COLORS[p.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {p.phone} · {fmtRelative(p.requestedAt)}
                  </p>
                  {p.mpesaRef && (
                    <p className="font-mono text-xs text-[var(--muted)] mt-0.5">Ref: {p.mpesaRef}</p>
                  )}
                  {p.notes && (
                    <p className="text-xs text-[var(--muted)] italic mt-0.5">{p.notes}</p>
                  )}
                  {p.processedAt && (
                    <p className="text-xs text-green-600 mt-0.5">Processed {fmtDateTime(p.processedAt)}</p>
                  )}
                </div>
                {p.status === "COMPLETED" && <span className="text-green-500 text-xl flex-shrink-0">✓</span>}
                {(p.status === "PROCESSING" || p.status === "APPROVED") && (
                  <span className="text-blue-500 text-xl flex-shrink-0 animate-pulse">⏳</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
