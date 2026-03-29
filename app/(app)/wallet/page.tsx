"use client";
import { useEffect, useState } from "react";
import { walletApi, unwrap } from "@/lib/api";

type WalletBalance = { balance: number; currency: string };
type WalletTx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  TOPUP: "Top-up",
  PAYMENT: "Payment",
  REFUND: "Refund",
  CASHBACK: "Cashback",
  ADJUSTMENT: "Adjustment",
};

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-500",
  REVERSED: "bg-[var(--surface)] text-[var(--muted)]",
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);

  // Top-up form
  const [method, setMethod] = useState<"mpesa" | "card">("mpesa");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMsg, setTopupMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    walletApi.balance().then((r) => {
      setWallet(unwrap<WalletBalance>(r));
      setLoading(false);
    }).catch(() => setLoading(false));

    walletApi.transactions({ limit: 30 }).then((r) => {
      const d = unwrap<{ items: WalletTx[] }>(r);
      setTxs(d.items ?? (d as unknown as WalletTx[]));
      setTxLoading(false);
    }).catch(() => setTxLoading(false));
  }, []);

  const refreshWallet = () => {
    walletApi.balance().then((r) => setWallet(unwrap<WalletBalance>(r)));
    walletApi.transactions({ limit: 30 }).then((r) => {
      const d = unwrap<{ items: WalletTx[] }>(r);
      setTxs(d.items ?? (d as unknown as WalletTx[]));
    });
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 10) {
      setTopupMsg({ type: "error", text: "Enter a valid amount (min KES 10)" });
      return;
    }
    if (method === "mpesa" && !phone) {
      setTopupMsg({ type: "error", text: "Enter your M-Pesa phone number" });
      return;
    }
    if (method === "card" && (!cardNumber || !cardExpiry || !cardCvv)) {
      setTopupMsg({ type: "error", text: "Fill in all card details" });
      return;
    }
    setTopupLoading(true);
    setTopupMsg(null);
    try {
      if (method === "mpesa") {
        await walletApi.topup(phone, Number(amount));
        setTopupMsg({ type: "success", text: `STK push sent to ${phone}. Enter your M-Pesa PIN to complete.` });
        setPhone(""); setAmount("");
      } else {
        // Card top-up — hits the same topup endpoint with card payload
        await walletApi.topup(phone, Number(amount), {
          paymentMethod: "card",
          cardNumber: cardNumber.replace(/\s/g, ""),
          expiry: cardExpiry,
          cvv: cardCvv,
        });
        setTopupMsg({ type: "success", text: "Card payment successful! Balance updated." });
        setCardNumber(""); setCardExpiry(""); setCardCvv(""); setAmount("");
      }
      refreshWallet();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Top-up failed";
      setTopupMsg({ type: "error", text: msg });
    } finally {
      setTopupLoading(false);
    }
  };

  const fmtDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
    } catch { return d; }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-6">My Wallet</h1>

        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#D93B2F] to-[#B02B20] text-white p-6 mb-6 shadow-lg">
          <p className="text-sm opacity-80 mb-1">Available Balance</p>
          {loading ? (
            <div className="h-10 w-48 bg-white/20 rounded animate-pulse" />
          ) : (
            <p className="text-4xl font-extrabold tracking-tight">
              {wallet?.currency ?? "KES"} {(wallet?.balance ?? 0).toFixed(2)}
            </p>
          )}
        </div>

        {/* Top-up form */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 mb-6 shadow-sm border border-[var(--border)]">
          <h2 className="font-bold text-[var(--text)] mb-4">Top Up Wallet</h2>

          {/* Method toggle */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setMethod("mpesa"); setTopupMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${method === "mpesa" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]"}`}
            >
              📱 M-Pesa
            </button>
            <button
              type="button"
              onClick={() => { setMethod("card"); setTopupMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${method === "card" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]"}`}
            >
              💳 Card
            </button>
          </div>

          <form onSubmit={handleTopup} className="space-y-3">
            {method === "mpesa" ? (
              <input
                type="tel"
                placeholder="M-Pesa Phone (07XXXXXXXX)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base w-full"
              />
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Card Number"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                    setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                  }}
                  className="input-base w-full font-mono tracking-widest"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="MM / YY"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCardExpiry(v.length > 2 ? `${v.slice(0, 2)} / ${v.slice(2)}` : v);
                    }}
                    className="input-base font-mono"
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="input-base font-mono tracking-widest"
                  />
                </div>
              </>
            )}

            <input
              type="number"
              placeholder="Amount (KES)"
              min={10}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-base w-full"
              required
            />

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {[100, 250, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="px-3 py-1 text-xs bg-[var(--surface)] hover:bg-[var(--border)] rounded-full font-medium transition"
                >
                  KES {v}
                </button>
              ))}
            </div>

            {topupMsg && (
              <div className={`rounded-xl px-4 py-3 text-sm ${topupMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {topupMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={topupLoading}
              className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
            >
              {topupLoading
                ? (method === "mpesa" ? "Sending STK Push…" : "Processing…")
                : (method === "mpesa" ? "Pay with M-Pesa" : "Pay with Card")}
            </button>
          </form>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 mb-6 flex gap-3 items-start text-sm text-orange-700">
          <span className="mt-0.5">ℹ️</span>
          <span>Use your wallet balance at checkout for faster ticket purchases — no need to re-enter your M-Pesa PIN each time.</span>
        </div>

        {/* Transactions */}
        <h2 className="font-bold text-[var(--text)] mb-3">Transaction History</h2>
        {txLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[var(--card-bg)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)]">
            <div className="text-4xl mb-3">🧾</div>
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => {
              const isCredit = tx.type === "TOPUP" || tx.type === "REFUND" || tx.type === "CASHBACK";
              return (
                <div key={tx.id} className="bg-[var(--card-bg)] rounded-xl px-4 py-3 flex items-center gap-4 border border-[var(--border)]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                    isCredit ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                    {isCredit ? "↓" : "↑"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.description || TYPE_LABELS[tx.type] || tx.type}</p>
                    <p className="text-xs text-[var(--muted)]">{fmtDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${tx.status === "FAILED" ? "text-[var(--muted)] line-through" : isCredit ? "text-green-600" : "text-[var(--text)]"}`}>
                      {isCredit ? "+" : "-"} KES {tx.amount.toFixed(0)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[tx.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
