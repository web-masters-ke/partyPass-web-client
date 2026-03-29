"use client";
import { useEffect, useState } from "react";
import { ordersApi, unwrap } from "@/lib/api";
import type { Order, PaginatedResponse } from "@/types";
import { fmtDate, fmtCurrency, fmtRelative } from "@/lib/utils";
import { useRouter } from "next/navigation";

const FALLBACK = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80",
  "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
];

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  PAID:              { label: "Paid",          icon: "✓",  bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
  PENDING:           { label: "Pending",        icon: "⏳", bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-200" },
  AWAITING_PAYMENT:  { label: "Awaiting Pay",   icon: "💳", bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-200" },
  FAILED:            { label: "Failed",         icon: "✗",  bg: "bg-red-50",     text: "text-red-600",    border: "border-red-200" },
  CANCELLED:         { label: "Cancelled",      icon: "✗",  bg: "bg-gray-100",   text: "text-[var(--muted)]", border: "border-[var(--border)]" },
  REFUNDED:          { label: "Refunded",       icon: "↩",  bg: "bg-blue-50",    text: "text-blue-600",   border: "border-blue-200" },
  PARTIALLY_REFUNDED:{ label: "Part Refunded",  icon: "↩",  bg: "bg-blue-50",    text: "text-blue-600",   border: "border-blue-200" },
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
      <div className="space-y-4">
        {[1,2,3].map((i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-[var(--border)] animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-40 bg-[var(--surface)]" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-[var(--border)] rounded w-2/3" />
              <div className="h-3 bg-[var(--border)] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-black mb-6 text-[var(--text)]">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🛒</div>
          <p className="font-bold text-xl text-[var(--text)] mb-2">No orders yet</p>
          <p className="text-[var(--muted)] text-sm mb-6">Grab tickets to your first event</p>
          <button onClick={() => router.push("/events")} className="btn-primary">Browse Parties</button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, idx) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
            const img = order.event?.coverImageUrl || FALLBACK[idx % FALLBACK.length];
            const ticketCount = order.tickets?.length ?? 0;

            return (
              <div key={order.id} className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card-bg)] shadow-sm hover:shadow-md transition-shadow">
                {/* Event banner */}
                <div className="relative h-40 overflow-hidden">
                  <img src={img} alt={order.event?.title ?? ""} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Status badge top-right */}
                  <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </div>

                  {/* Event info bottom-left */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-black text-lg leading-tight line-clamp-1">{order.event?.title ?? "Event"}</p>
                    {order.event?.startDateTime && (
                      <p className="text-white/70 text-xs mt-0.5">📅 {fmtDate(order.event.startDateTime)}</p>
                    )}
                  </div>
                </div>

                {/* Order details */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                      <span>🎟️ {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}</span>
                      {order.paymentMethod && (
                        <span className="hidden sm:inline">· {order.paymentMethod.replace(/_/g, " ")}</span>
                      )}
                      <span>· {fmtRelative(order.createdAt)}</span>
                    </div>
                    <p className="font-black text-xl text-[var(--text)]">{fmtCurrency(order.total, order.currency)}</p>
                  </div>

                  {order.mpesaRef && (
                    <div className="mt-3 bg-[var(--surface)] rounded-xl px-3 py-2 flex items-center gap-2">
                      <span className="text-green-600 text-sm font-bold">M-Pesa</span>
                      <span className="text-xs text-[var(--muted)]">Ref:</span>
                      <span className="font-mono text-xs text-[var(--text)] font-semibold">{order.mpesaRef}</span>
                    </div>
                  )}

                  {order.status === "PAID" && (
                    <button
                      onClick={() => router.push("/tickets")}
                      className="mt-3 w-full py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      View Tickets →
                    </button>
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
