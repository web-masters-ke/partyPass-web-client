"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { wristbandApi, unwrap } from "@/lib/api";
import toast from "react-hot-toast";

type Wristband = {
  id: string;
  nfcId: string;
  balance: number;
  isActive: boolean;
  qrDataUrl?: string;
  transactions?: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
};

export default function WristbandPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [wb, setWb] = useState<Wristband | null>(null);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState("");
  const [topping, setTopping] = useState(false);
  const [showTopup, setShowTopup] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await wristbandApi.my(eventId);
      setWb(unwrap<Wristband>(res));
    } catch {
      setWb(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function handleTopup() {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 50) { toast.error("Minimum top-up is KES 50"); return; }
    if (!wb) return;
    setTopping(true);
    try {
      await wristbandApi.topupFromWallet(wb.nfcId, amount);
      toast.success(`KES ${amount} added to wristband`);
      setTopupAmount("");
      setShowTopup(false);
      load();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Top-up failed");
    } finally { setTopping(false); }
  }

  if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading…</div>;

  if (!wb) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-6xl mb-4">📿</div>
        <h2 className="text-xl font-bold mb-2">No Wristband Yet</h2>
        <p className="text-[var(--muted)] text-sm mb-6">
          Issue a digital wristband from your ticket to pay cashlessly at venue bars and vendors.
        </p>
        <button onClick={() => router.push("/tickets")} className="btn-primary">
          View My Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-black mb-6">My Wristband</h1>

      {/* Balance card */}
      <div
        className="rounded-2xl p-6 mb-6 text-white"
        style={{ background: "linear-gradient(135deg, #D93B2F 0%, #8B0000 100%)" }}
      >
        <p className="text-xs font-semibold tracking-widest text-white/70 mb-2">WRISTBAND BALANCE</p>
        <p className="text-4xl font-black tracking-tight mb-1">
          KES {wb.balance.toFixed(2)}
        </p>
        <p className="text-xs font-mono text-white/50">{wb.nfcId}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${wb.isActive ? "bg-green-500/30" : "bg-white/10"}`}>
            {wb.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      </div>

      {/* Top-up button */}
      {wb.isActive && !showTopup && (
        <button onClick={() => setShowTopup(true)} className="btn-primary w-full mb-6">
          + Top Up from Wallet
        </button>
      )}

      {/* Top-up form */}
      {showTopup && (
        <div className="card p-5 mb-6">
          <h3 className="font-bold mb-3">Top Up Wristband</h3>
          <p className="text-sm text-[var(--muted)] mb-4">Deducted from your PartyPass wallet</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {[100, 250, 500, 1000, 2000].map((a) => (
              <button
                key={a}
                onClick={() => setTopupAmount(String(a))}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  topupAmount === String(a)
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                KES {a}
              </button>
            ))}
          </div>
          <input
            className="input-base mb-4"
            type="number"
            placeholder="Custom amount (min KES 50)"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={handleTopup} disabled={topping} className="btn-primary flex-1">
              {topping ? "Processing…" : "Add to Wristband"}
            </button>
            <button onClick={() => setShowTopup(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QR code — printable */}
      <div className="card p-6 mb-6 text-center">
        <h3 className="font-bold mb-1">Scan at Venue</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Show this QR code to bar staff to pay. Print it for faster access.
        </p>
        {wb.qrDataUrl ? (
          <img
            src={wb.qrDataUrl}
            alt="Wristband QR"
            className="w-52 h-52 mx-auto rounded-xl border border-[var(--border)]"
          />
        ) : (
          <div className="w-52 h-52 mx-auto rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center">
            <span className="text-6xl">📲</span>
          </div>
        )}
        <p className="text-xs font-mono text-[var(--muted)] mt-3">{wb.nfcId}</p>
        <button
          onClick={() => window.print()}
          className="mt-4 text-sm text-[var(--primary)] font-semibold hover:underline"
        >
          🖨 Print QR Code
        </button>
      </div>

      {/* Transaction history */}
      {wb.transactions && wb.transactions.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Recent Transactions</h3>
          <div className="space-y-2">
            {wb.transactions.map((tx) => {
              const isCredit = tx.type === "TOPUP" || tx.type === "REFUND";
              return (
                <div key={tx.id} className="card p-3 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      isCredit ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {isCredit ? "↓" : "↑"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{tx.type}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ${isCredit ? "text-green-600" : "text-red-600"}`}
                  >
                    {isCredit ? "+" : "-"}KES {Number(tx.amount).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
