"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ticketsApi, unwrap } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Ticket } from "@/types";
import { fmtDate, fmtTime, fmtCurrency } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  VALID: "bg-green-100 text-green-700 border-green-200",
  USED: "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]",
  EXPIRED: "bg-red-100 text-red-500 border-red-200",
  CANCELLED: "bg-red-100 text-red-500 border-red-200",
  TRANSFERRED: "bg-blue-100 text-blue-600 border-blue-200",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const handlePdf = async () => {
    const token = getToken();
    const url = `${API_BASE}/tickets/${id}/pdf`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${res.status}`);
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("pdf")) {
        // Response is JSON error envelope, not a PDF
        const body = await res.json();
        alert(body?.error?.message ?? "Could not generate PDF.");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `partypass-ticket-${id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Could not download PDF. Try again.");
    }
  };

  useEffect(() => {
    ticketsApi.get(id)
      .then((r) => setTicket(unwrap<Ticket>(r)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading ticket…</div>;
  if (!ticket) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">🎟️</div>
      <p className="text-[var(--muted)]">Ticket not found</p>
      <button onClick={() => router.push("/tickets")} className="btn-primary mt-4">My Tickets</button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <button onClick={() => router.back()} className="text-sm text-[var(--muted)] hover:text-[var(--primary)] mb-4 flex items-center gap-1">
        ← Back to tickets
      </button>

      {/* Ticket card */}
      <div className={`card overflow-hidden border-2 ${STATUS_COLORS[ticket.status] || "border-[var(--border)]"}`}>
        {/* Event cover */}
        <div className="h-40 bg-[var(--primary)] relative">
          {ticket.event.coverImageUrl
            ? <img src={ticket.event.coverImageUrl} alt={ticket.event.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white/20 text-7xl">🎉</div>
          }
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${STATUS_COLORS[ticket.status] || "bg-[var(--surface)] text-[var(--muted)]"}`}>
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Dashed divider */}
        <div className="border-t-2 border-dashed border-[var(--border)] mx-4 relative">
          <div className="absolute -left-6 -top-3 w-6 h-6 rounded-full bg-[var(--bg)] border border-[var(--border)]" />
          <div className="absolute -right-6 -top-3 w-6 h-6 rounded-full bg-[var(--bg)] border border-[var(--border)]" />
        </div>

        {/* Ticket info */}
        <div className="p-5">
          <h1 className="text-xl font-black leading-tight mb-1">{ticket.event.title}</h1>
          <p className="text-sm text-[var(--muted)]">📅 {fmtDate(ticket.event.startDateTime)}</p>
          <p className="text-sm text-[var(--muted)]">🕐 {fmtTime(ticket.event.startDateTime)}</p>

          {(() => {
            const name = ticket.holderName ?? (ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : null);
            const email = ticket.holderEmail ?? ticket.user?.email ?? null;
            return (
              <div className="mt-3 text-sm text-[var(--muted)]">
                {name && <p>👤 {name}</p>}
                {email && <p>✉️ {email}</p>}
              </div>
            );
          })()}

          <div className="mt-4 flex items-center gap-2">
            {ticket.tier?.color && <span className="w-3 h-3 rounded-full" style={{ background: ticket.tier.color }} />}
            <span className="font-bold">{ticket.tier?.name ?? "General Admission"}</span>
          </div>
          {ticket.tier.perks?.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {ticket.tier.perks.map((p) => (
                <span key={p} className="text-xs bg-[var(--surface)] px-2 py-0.5 rounded-full text-[var(--muted)]">✓ {p}</span>
              ))}
            </div>
          )}

          {/* Amount paid */}
          {ticket.order?.total != null && (
            <div className="mt-4 pt-4 border-t border-dashed border-[var(--border)]">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Amount Paid</span>
                <span className="font-bold">{fmtCurrency(ticket.order.total, ticket.order.currency)}</span>
              </div>
              {ticket.order.paidAt && (
                <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
                  <span>Payment Date</span>
                  <span>{fmtDate(ticket.order.paidAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* QR code */}
          {ticket.status === "VALID" && ticket.qrCode && (
            <div className="mt-5 text-center">
              <div className="border-t border-dashed border-[var(--border)] pt-5 mb-4 relative">
                <div className="absolute -left-6 -top-3 w-6 h-6 rounded-full bg-[var(--bg)] border border-[var(--border)]" />
                <div className="absolute -right-6 -top-3 w-6 h-6 rounded-full bg-[var(--bg)] border border-[var(--border)]" />
              </div>
              <p className="text-xs text-[var(--muted)] mb-3 font-medium uppercase tracking-wide">Scan at entry</p>
              {/* White bg is required for QR scanners */}
              <div className="inline-block bg-white p-4 rounded-2xl border-2 border-[var(--border)] shadow-sm">
                <img
                  src={
                    ticket.qrCode.startsWith("http") || ticket.qrCode.startsWith("data:")
                      ? ticket.qrCode
                      : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(ticket.qrCode)}`
                  }
                  alt="Scan at entry"
                  width={176}
                  height={176}
                  className="block"
                />
              </div>
              <p className="text-xs text-[var(--muted)] mt-3 font-mono tracking-widest">{ticket.id.toUpperCase().slice(0, 8)}</p>
            </div>
          )}

          {ticket.status !== "VALID" && (
            <div className="mt-5 text-center py-4 bg-[var(--surface)] rounded-xl">
              <p className="text-sm font-medium text-[var(--muted)]">
                {ticket.status === "USED" ? "✅ Ticket scanned at entry" : "This ticket is no longer valid"}
              </p>
            </div>
          )}
        </div>
        {/* Action buttons */}
        <div className="mt-6">
          <button
            onClick={handlePdf}
            className="w-full border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--text)] font-semibold py-3 rounded-full transition text-sm flex items-center justify-center gap-2"
          >
            📄 Download PDF Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
