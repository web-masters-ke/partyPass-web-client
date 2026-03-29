"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ticketsApi, pdfApi, digitalWalletApi, unwrap } from "@/lib/api";
import type { Ticket } from "@/types";
import { fmtDate, fmtTime, fmtCurrency } from "@/lib/utils";

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handlePdf = async () => {
    setPdfLoading(true); setActionMsg(null);
    try {
      await pdfApi.generate(id);
      setActionMsg("✅ PDF generated — check your email.");
    } catch { setActionMsg("❌ Could not generate PDF."); }
    finally { setPdfLoading(false); }
  };
  const handleApple = async () => {
    setAppleLoading(true); setActionMsg(null);
    try {
      await digitalWalletApi.apple(id);
      setActionMsg("✅ Apple Wallet pass ready.");
    } catch { setActionMsg("❌ Apple Wallet unavailable."); }
    finally { setAppleLoading(false); }
  };
  const handleGoogle = async () => {
    setGoogleLoading(true); setActionMsg(null);
    try {
      await digitalWalletApi.google(id);
      setActionMsg("✅ Google Wallet pass ready.");
    } catch { setActionMsg("❌ Google Wallet unavailable."); }
    finally { setGoogleLoading(false); }
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

          <div className="mt-4 flex items-center gap-2">
            {ticket.tier.color && <span className="w-3 h-3 rounded-full" style={{ background: ticket.tier.color }} />}
            <span className="font-bold">{ticket.tier.name}</span>
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
        <div className="mt-6 space-y-2">
          {actionMsg && (
            <div className={`text-sm rounded-xl px-4 py-3 mb-1 ${actionMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {actionMsg}
            </div>
          )}
          <button
            onClick={handlePdf}
            disabled={pdfLoading}
            className="w-full border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--text)] font-semibold py-3 rounded-full transition text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            📄 {pdfLoading ? "Generating PDF…" : "Download PDF Ticket"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleApple}
              disabled={appleLoading}
              className="flex-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--text)] font-semibold py-3 rounded-full transition text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
               {appleLoading ? "…" : "Apple Wallet"}
            </button>
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="flex-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--text)] font-semibold py-3 rounded-full transition text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              💳 {googleLoading ? "…" : "Google Wallet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
