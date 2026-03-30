"use client";
import { useEffect, useState } from "react";
import { walletApi, unwrap } from "@/lib/api";

type WalletData = { balance: number; currency: string; recentTransactions?: WalletTx[] };
type WalletTx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  createdAt: string;
};

const TX_ICONS: Record<string, string> = {
  TOPUP: "↓", PAYMENT: "↑", REFUND: "↓", CASHBACK: "↓", ADJUSTMENT: "~",
};
const TX_COLORS: Record<string, string> = {
  TOPUP: "text-green-600", REFUND: "text-green-600", CASHBACK: "text-green-600",
  PAYMENT: "text-[var(--text)]", ADJUSTMENT: "text-[var(--muted)]",
};
const TX_BG: Record<string, string> = {
  TOPUP: "bg-green-100", REFUND: "bg-green-100", CASHBACK: "bg-green-100",
  PAYMENT: "bg-orange-100", ADJUSTMENT: "bg-[var(--surface)]",
};
const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-green-500", PENDING: "bg-yellow-400", FAILED: "bg-red-500", REVERSED: "bg-gray-400",
};

function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtTs(d: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
  } catch { return d; }
}

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-up form
  const [showTopup, setShowTopup] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    walletApi.balance().then((r) => {
      const d = unwrap<WalletData>(r);
      setWallet(d);
      if (d.recentTransactions) setTxs(d.recentTransactions);
      setLoading(false);
    }).catch(() => setLoading(false));

    walletApi.transactions({ limit: 30 }).then((r) => {
      const d = unwrap<{ items: WalletTx[] }>(r);
      setTxs(d.items ?? (d as unknown as WalletTx[]));
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < 10) { setMsg({ ok: false, text: "Minimum top-up is KES 10" }); return; }
    if (!phone.trim()) { setMsg({ ok: false, text: "Enter your M-Pesa phone number" }); return; }
    setBusy(true); setMsg(null);
    try {
      await walletApi.topup(phone.trim(), amt);
      setMsg({ ok: true, text: `STK push sent to ${phone.trim()}. Enter your M-Pesa PIN to complete top-up.` });
      setPhone(""); setAmount("");
      setTimeout(load, 5000); // refresh after 5s to catch completed topup
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      setMsg({ ok: false, text: d?.error?.message ?? d?.message ?? "Top-up failed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const balance = wallet?.balance ?? 0;

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-4 pt-2">
      <div className="h-44 rounded-3xl bg-[var(--surface)] animate-pulse" />
      <div className="h-48 rounded-2xl bg-[var(--surface)] animate-pulse" />
      <div className="h-64 rounded-2xl bg-[var(--surface)] animate-pulse" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">

      {/* Hero balance card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 mb-5 shadow-xl relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">PartyPass Wallet</p>
        <p className="text-white/70 text-sm mb-1">Available Balance</p>
        <p className="text-white text-5xl font-black tracking-tight leading-none">
          {fmtAmt(balance)}
          <span className="text-white/50 text-xl font-semibold ml-2">KES</span>
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => { setShowTopup((v) => !v); setMsg(null); }}
            className="flex items-center gap-2 bg-white text-[#0f3460] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
          >
            + Add Money
          </button>
          <div className="flex items-center gap-1.5 bg-white/10 px-4 py-2.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white/80 text-xs font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Top-up form (collapsible) */}
      {showTopup && (
        <div className="card p-5 mb-5 border-2 border-[var(--primary)]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Add Money via M-Pesa</h2>
            <button onClick={() => { setShowTopup(false); setMsg(null); }} className="text-[var(--muted)] hover:text-[var(--text)] text-lg leading-none">×</button>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 mb-4">
            An STK push will be sent to your phone. Enter your M-Pesa PIN to confirm.
          </div>

          <form onSubmit={handleTopup} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">M-Pesa Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base w-full"
                disabled={busy}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Amount (KES)</label>
              <input
                type="number"
                placeholder="Enter amount"
                min={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-base w-full"
                disabled={busy}
              />
            </div>

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={`px-3 py-1.5 text-xs rounded-full font-semibold border transition-all ${
                    amount === String(v)
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]"
                  }`}
                >
                  {v.toLocaleString()}
                </button>
              ))}
            </div>

            {msg && (
              <div className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[var(--primary)] text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-60 text-sm"
            >
              {busy ? "Sending STK Push…" : `Pay KES ${amount ? Number(amount).toLocaleString() : "—"} via M-Pesa`}
            </button>
          </form>
        </div>
      )}

      {/* How wallet works */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-5 py-4 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">How it works</p>
        <div className="space-y-2.5">
          {[
            { icon: "📱", text: "Top up via M-Pesa instantly" },
            { icon: "🎟️", text: "Pay for tickets at checkout without re-entering your PIN" },
            { icon: "↩️", text: "Refunds go straight back to your wallet" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-sm text-[var(--text)]">
              <span className="text-base">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--muted)]">Transactions</h2>
          {txs.length > 0 && <span className="text-xs text-[var(--muted)]">{txs.length} records</span>}
        </div>

        {txs.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-sm text-[var(--muted)]">No transactions yet</p>
            <p className="text-xs text-[var(--muted)] mt-1">Top up your wallet to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {txs.map((tx) => {
              const isCredit = ["TOPUP", "REFUND", "CASHBACK"].includes(tx.type);
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${TX_BG[tx.type] ?? "bg-[var(--surface)]"}`}>
                    <span className={TX_COLORS[tx.type] ?? "text-[var(--muted)]"}>{TX_ICONS[tx.type] ?? "·"}</span>
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.description || tx.type}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[tx.status] ?? "bg-gray-400"}`} />
                      <p className="text-xs text-[var(--muted)]">{tx.status} · {fmtTs(tx.createdAt)}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <p className={`text-base font-black flex-shrink-0 ${
                    tx.status === "FAILED" ? "text-[var(--muted)] line-through" : isCredit ? "text-green-600" : "text-[var(--text)]"
                  }`}>
                    {isCredit ? "+" : "−"}KES {fmtAmt(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
