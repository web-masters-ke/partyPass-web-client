"use client";
import { useEffect, useState } from "react";
import { ordersApi, unwrap } from "@/lib/api";
import type { Order, PaginatedResponse } from "@/types";
import { fmtDate, fmtCurrency, fmtRelative } from "@/lib/utils";
import { useRouter } from "next/navigation";

const FALLBACK = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120&q=70",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=120&q=70",
  "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=120&q=70",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&q=70",
];

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  PAID:               { label: "Paid",         dot: "bg-green-500",  text: "text-green-600" },
  PENDING:            { label: "Pending",       dot: "bg-yellow-400", text: "text-yellow-600" },
  AWAITING_PAYMENT:   { label: "Awaiting Pay",  dot: "bg-yellow-400", text: "text-yellow-600" },
  FAILED:             { label: "Failed",        dot: "bg-red-500",    text: "text-red-500" },
  CANCELLED:          { label: "Cancelled",     dot: "bg-gray-400",   text: "text-[var(--muted)]" },
  REFUNDED:           { label: "Refunded",      dot: "bg-blue-400",   text: "text-blue-500" },
  PARTIALLY_REFUNDED: { label: "Part Refunded", dot: "bg-blue-400",   text: "text-blue-500" },
};

const PAYMENT_ICONS: Record<string, string> = {
  MPESA: "🟢",
  CARD: "💳",
  WALLET: "👛",
  TEST: "🧪",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.myOrders({ limit: 50 })
      .then((r) => {
        const d = unwrap<PaginatedResponse<Order>>(r);
        setOrders(d.items ?? (d as unknown as Order[]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="h-9 w-56 bg-[var(--surface)] rounded-xl animate-pulse mb-6" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 animate-pulse flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="w-16 h-16 rounded-xl bg-[var(--surface)] shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 bg-[var(--border)] rounded w-2/3" />
              <div className="h-3 bg-[var(--border)] rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1 text-[var(--text)]">Purchase History</h1>
      <p className="text-sm text-[var(--muted)] mb-6">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>

      {orders.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🧾</div>
          <p className="font-bold text-xl text-[var(--text)] mb-2">No orders yet</p>
          <p className="text-[var(--muted)] text-sm mb-6">Grab tickets to your first event</p>
          <button onClick={() => router.push("/events")} className="btn-primary">Browse Events</button>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-[var(--border)]">
          {orders.map((order, idx) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
            const img = order.event?.coverImageUrl || FALLBACK[idx % FALLBACK.length];
            const ticketCount = order.tickets?.length ?? 0;
            const paymentIcon = PAYMENT_ICONS[order.paymentMethod?.toUpperCase() ?? ""] ?? "💰";

            return (
              <div
                key={order.id}
                onClick={() => order.status === "PAID" && router.push("/tickets")}
                className={`flex items-center gap-4 p-4 transition-colors ${order.status === "PAID" ? "cursor-pointer hover:bg-[var(--surface)]" : ""}`}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[var(--surface)]">
                  <img
                    src={img}
                    alt={order.event?.title ?? ""}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK[0]; }}
                  />
                </div>

                {/* Middle info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--text)] truncate">{order.event?.title ?? "Event"}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {order.event?.startDateTime ? fmtDate(order.event.startDateTime) : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* status */}
                    <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="text-[var(--border)]">·</span>
                    {/* ticket count */}
                    <span className="text-xs text-[var(--muted)]">
                      🎟️ {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--border)]">·</span>
                    {/* payment method */}
                    <span className="text-xs text-[var(--muted)]">
                      {paymentIcon} {(order.paymentMethod ?? "").replace(/_/g, " ") || "—"}
                    </span>
                  </div>
                  {order.mpesaRef && (
                    <p className="font-mono text-[10px] text-[var(--muted)] mt-1">Ref: {order.mpesaRef}</p>
                  )}
                </div>

                {/* Right: amount + time */}
                <div className="text-right shrink-0">
                  <p className="font-black text-base text-[var(--text)]">{fmtCurrency(order.total, order.currency)}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">{fmtRelative(order.createdAt)}</p>
                  {order.status === "PAID" && (
                    <span className="text-[10px] text-[var(--primary)] font-semibold mt-1 block">View tickets →</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
