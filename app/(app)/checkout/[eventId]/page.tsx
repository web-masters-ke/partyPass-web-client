"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { eventsApi, ordersApi, promosApi, walletApi, unwrap } from "@/lib/api";
import api from "@/lib/api";
import type { Event, Order } from "@/types";
import { fmtCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

type PayMethod = "MPESA_STK" | "MPESA_PAYBILL" | "WALLET" | "CARD" | "TEST";

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        metadata?: Record<string, unknown>;
        onClose: () => void;
        callback: (res: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxxxxxxxx";

export default function CheckoutPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [method, setMethod] = useState<PayMethod>("MPESA_STK");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userEmail, setUserEmail] = useState("");

  // Parse tier selections from query: "tierId:qty,tierId:qty"
  const selections = (sp.get("tiers") || "").split(",").filter(Boolean).map((s) => {
    const [tierId, qty] = s.split(":");
    return { tierId, qty: parseInt(qty) };
  });

  useEffect(() => {
    eventsApi.get(eventId)
      .then((r) => setEvent(unwrap<Event>(r)))
      .finally(() => setLoading(false));
    api.get("/loyalty/me")
      .then((r) => setLoyaltyPoints(unwrap<{ points: number }>(r)?.points ?? 0))
      .catch(() => {});
    walletApi.balance()
      .then((r) => setWalletBalance(unwrap<{ balance: number }>(r)?.balance ?? 0))
      .catch(() => {});
    api.get("/users/me")
      .then((r) => setUserEmail(unwrap<{ email: string }>(r)?.email ?? ""))
      .catch(() => {});
    // Load Paystack inline script
    if (!document.getElementById("paystack-inline")) {
      const s = document.createElement("script");
      s.id = "paystack-inline";
      s.src = "https://js.paystack.co/v1/inline.js";
      s.async = true;
      document.head.appendChild(s);
    }
  }, [eventId]);

  const subtotal = selections.reduce((sum, { tierId, qty }) => {
    const tier = event?.ticketTiers?.find((t) => t.id === tierId);
    return sum + (tier ? tier.price * qty : 0);
  }, 0);
  const maxLoyaltyPts = Math.min(loyaltyPoints, Math.floor(loyaltyPoints / 100) * 100);
  const loyaltyDiscount = useLoyalty && loyaltyPoints >= 100
    ? Math.min(maxLoyaltyPts / 10, subtotal * 0.5)
    : 0;
  const loyaltyPointsToRedeem = useLoyalty ? loyaltyDiscount * 10 : 0;
  const total = subtotal;
  const finalTotal = Math.max(0, total - discount - loyaltyDiscount);

  async function applyPromo() {
    try {
      const res = await promosApi.validate(promoCode, eventId);
      const data = unwrap<{ discountAmount: number }>(res);
      setDiscount(data.discountAmount);
      setPromoApplied(true);
      toast.success("Promo applied!");
    } catch { toast.error("Invalid promo code"); }
  }

  async function placeOrder() {
    if (method === "MPESA_STK" && !phone) { toast.error("Enter your M-Pesa phone number"); return; }
    if (method === "WALLET" && walletBalance < finalTotal) {
      toast.error(`Insufficient wallet balance. You have ${fmtCurrency(walletBalance)}.`);
      return;
    }
    setPlacing(true);
    try {
      const items = selections.map(({ tierId, qty }) => ({ tierId, quantity: qty }));
      const res = await ordersApi.create({
        eventId,
        items,
        promoCode: promoApplied ? promoCode : undefined,
        ...(loyaltyPointsToRedeem >= 100 ? { loyaltyPointsToRedeem } : {}),
        ...(method === "WALLET" ? { paymentMethod: "WALLET" } : {}),
      });
      const newOrder = unwrap<Order>(res);
      setOrder(newOrder);

      if (method === "WALLET") {
        toast.success("Paid from wallet! Tickets issued 🎉");
        router.push("/tickets");
        return;
      }

      if (method === "TEST") {
        await ordersApi.testPay(newOrder.id);
        toast.success("Test payment confirmed! Tickets issued 🎉");
        router.push("/tickets");
        return;
      }

      if (method === "CARD") {
        setPlacing(false);
        if (!window.PaystackPop) {
          toast.error("Card payment not ready — please try again in a moment");
          return;
        }
        const ref = `PP-${newOrder.id.slice(-8).toUpperCase()}-${Date.now()}`;
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: userEmail || "guest@partypass.com",
          amount: Math.round(finalTotal * 100), // kobo
          currency: "KES",
          ref,
          metadata: { orderId: newOrder.id },
          onClose: () => { toast("Card payment cancelled"); },
          callback: async (response) => {
            try {
              await ordersApi.payCard(newOrder.id, response.reference);
              toast.success("Card payment confirmed! Tickets issued 🎉");
              router.push("/tickets");
            } catch {
              toast.error("Payment verification failed — contact support with ref: " + response.reference);
            }
          },
        });
        handler.openIframe();
        return;
      }

      if (method === "MPESA_STK") {
        await ordersApi.initiateMpesa(newOrder.id, phone);
        toast.success("STK Push sent! Check your phone.");
        setPolling(true);
        pollStatus(newOrder.id);
      } else {
        const pb = await ordersApi.initiatePaybill(newOrder.id);
        const pbData = unwrap<{ paybill: string; accountRef: string; amount: number }>(pb);
        toast.success(`Pay to Paybill ${pbData.paybill}, Account: ${pbData.accountRef}`);
        setPolling(true);
        pollStatus(newOrder.id);
      }
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to place order");
    } finally { setPlacing(false); }
  }

  const pollStatus = useCallback((orderId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await ordersApi.checkStatus(orderId);
        const o = unwrap<Order>(res);
        if (o.status === "PAID") {
          clearInterval(interval);
          setPolling(false);
          toast.success("Payment confirmed! 🎉");
          router.push(`/tickets`);
        }
      } catch {}
      if (attempts >= 24) { clearInterval(interval); setPolling(false); }
    }, 5000);
  }, [router]);

  if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black mb-6">Checkout</h1>

      <div className="card p-5 mb-4">
        <h2 className="font-bold mb-3">{event?.title}</h2>
        {selections.map(({ tierId, qty }) => {
          const tier = event?.ticketTiers?.find((t) => t.id === tierId);
          if (!tier) return null;
          return (
            <div key={tierId} className="flex justify-between text-sm mb-2">
              <span>{tier.name} × {qty}</span>
              <span className="font-medium">{fmtCurrency(tier.price * qty, tier.currency)}</span>
            </div>
          );
        })}
        {/* Promo */}
        {!promoApplied && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            <input className="input-base flex-1 !py-2" placeholder="Promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
            <button onClick={applyPromo} className="btn-primary !py-2 !px-4 !text-sm">Apply</button>
          </div>
        )}
        {promoApplied && discount > 0 && (
          <div className="flex justify-between text-sm mt-2 text-green-600 font-medium">
            <span>Promo discount</span><span>-{fmtCurrency(discount)}</span>
          </div>
        )}
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between text-sm mt-1 text-yellow-600 font-medium">
            <span>Loyalty discount ({loyaltyPointsToRedeem} pts)</span>
            <span>-{fmtCurrency(loyaltyDiscount)}</span>
          </div>
        )}
        <div className="border-t border-[var(--border)] pt-3 mt-3 flex justify-between font-black text-lg">
          <span>Total</span><span>{fmtCurrency(finalTotal)}</span>
        </div>
      </div>

      {/* Loyalty points toggle */}
      {loyaltyPoints >= 100 && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <div className="text-2xl">⭐</div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Use loyalty points</p>
            <p className="text-xs text-[var(--muted)]">
              {loyaltyPoints} pts = up to {fmtCurrency(loyaltyPoints / 10)} off (max 50%)
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useLoyalty}
              onChange={(e) => setUseLoyalty(e.target.checked)}
            />
            <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
          </label>
        </div>
      )}

      <div className="card p-5 mb-4">
        <h2 className="font-bold mb-4">Payment Method</h2>
        {([
          { v: "MPESA_STK", label: "M-Pesa STK Push", sub: "We send a prompt to your phone" },
          { v: "MPESA_PAYBILL", label: "M-Pesa Paybill", sub: "Pay to our paybill number manually" },
          {
            v: "WALLET",
            label: "PartyPass Wallet",
            sub: walletBalance >= finalTotal
              ? `Balance: ${fmtCurrency(walletBalance)} — instant, no PIN needed`
              : `Balance: ${fmtCurrency(walletBalance)} — insufficient for this order`,
          },
          { v: "CARD", label: "💳 Card / Bank", sub: "Visa, Mastercard, or bank transfer via Paystack" },
          { v: "TEST", label: "🧪 Test Payment", sub: "Sandbox only — instantly issues tickets" },
        ] as { v: PayMethod; label: string; sub: string }[]).map((o) => {
          const disabled = o.v === "WALLET" && walletBalance < finalTotal;
          return (
            <div key={o.v} onClick={() => !disabled && setMethod(o.v)}
              className={`p-3 rounded-xl border mb-2 transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${method === o.v ? "border-[var(--primary)] bg-[#fde8e7]" : "border-[var(--border)]"}`}>
              <p className={`font-semibold text-sm ${method === o.v ? "text-[var(--primary)]" : ""}`}>{o.label}</p>
              <p className="text-xs text-[var(--muted)]">{o.sub}</p>
            </div>
          );
        })}
        {method === "MPESA_STK" && (
          <input className="input-base mt-2" type="tel" placeholder="M-Pesa phone (e.g. 0712345678)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        )}
      </div>

      {polling ? (
        <div className="card p-5 text-center">
          <div className="text-3xl mb-2">📱</div>
          <p className="font-bold">Waiting for payment…</p>
          <p className="text-sm text-[var(--muted)] mt-1">Check your phone and enter your M-Pesa PIN</p>
          <div className="mt-3 flex justify-center gap-1">
            {[0,1,2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <button onClick={placeOrder} disabled={placing} className="btn-primary w-full text-base py-4">
          {placing ? "Processing…" : `Pay ${fmtCurrency(finalTotal)}`}
        </button>
      )}
    </div>
  );
}
