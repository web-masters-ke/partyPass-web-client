"use client";
import { useEffect, useState } from "react";
import { ticketsApi, unwrap } from "@/lib/api";
import type { Ticket, PaginatedResponse } from "@/types";
import { fmtDate, fmtTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  VALID: "bg-green-100 text-green-700",
  USED: "bg-[var(--surface)] text-[var(--muted)]",
  EXPIRED: "bg-red-100 text-red-500",
  CANCELLED: "bg-red-100 text-red-500",
  TRANSFERRED: "bg-blue-100 text-blue-600",
};
const STATUS_LABELS: Record<string, string> = {
  VALID: "Valid",
  USED: "Used",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  TRANSFERRED: "Transferred",
};

type EventGroup = {
  eventId: string;
  title: string;
  coverImageUrl?: string;
  startDateTime: string;
  tickets: Ticket[];
};

function groupByEvent(tickets: Ticket[]): EventGroup[] {
  const map = new Map<string, EventGroup>();
  for (const t of tickets) {
    const key = t.event?.id ?? t.id;
    if (!map.has(key)) {
      map.set(key, {
        eventId: key,
        title: t.event?.title ?? "Event",
        coverImageUrl: t.event?.coverImageUrl,
        startDateTime: t.event?.startDateTime ?? t.createdAt,
        tickets: [],
      });
    }
    map.get(key)!.tickets.push(t);
  }
  return Array.from(map.values());
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsApi
      .myTickets()
      .then((r) => setTickets(unwrap<PaginatedResponse<Ticket>>(r).items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="text-center py-20 text-[var(--muted)]">
        Loading your tickets…
      </div>
    );

  const groups = groupByEvent(tickets);
  const now = new Date();
  const upcoming = groups.filter(
    (g) => !g.startDateTime || new Date(g.startDateTime) >= now
  );
  const past = groups.filter(
    (g) => g.startDateTime && new Date(g.startDateTime) < now
  );

  return (
    <div>
      <h1 className="text-3xl font-black mb-6">My Tickets 🎟️</h1>

      {tickets.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">🎈</div>
          <p className="font-medium text-[var(--muted)]">No tickets yet</p>
          <button
            onClick={() => router.push("/events")}
            className="btn-primary mt-4"
          >
            Browse Parties
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
                Upcoming
              </h2>
              <div className="space-y-4">
                {upcoming.map((g) => (
                  <EventTicketGroup
                    key={g.eventId}
                    group={g}
                    router={router}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
                Past
              </h2>
              <div className="space-y-4">
                {past.map((g) => (
                  <EventTicketGroup
                    key={g.eventId}
                    group={g}
                    router={router}
                    isPast
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EventTicketGroup({
  group,
  router,
  isPast = false,
}: {
  group: EventGroup;
  router: ReturnType<typeof useRouter>;
  isPast?: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-md"
      style={{ opacity: isPast ? 0.75 : 1 }}
    >
      {/* Event banner */}
      <div className="relative h-40 bg-[var(--primary)]">
        {group.coverImageUrl ? (
          <img
            src={group.coverImageUrl}
            alt={group.title}
            className="w-full h-full object-cover"
            style={{ filter: isPast ? "brightness(0.55)" : undefined }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-[var(--primary)] to-rose-700">
            🎉
          </div>
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* event info */}
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-white font-black text-lg leading-tight line-clamp-2">
            {group.title}
          </p>
          <p className="text-white/80 text-xs mt-1">
            📅 {fmtDate(group.startDateTime)}
          </p>
        </div>
        {/* ticket count badge */}
        <div className="absolute top-3 right-3 bg-black/55 text-white text-xs font-semibold px-3 py-1 rounded-full">
          {group.tickets.length} ticket{group.tickets.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Perforation line */}
      <div className="relative flex items-center bg-[var(--card-bg)]">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] z-10" />
        <div className="flex-1 border-t-2 border-dashed border-[var(--border)] mx-4" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] z-10" />
      </div>

      {/* Ticket rows */}
      <div className="bg-[var(--card-bg)] divide-y divide-[var(--border)]">
        {group.tickets.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => router.push(`/tickets/${ticket.id}`)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--surface)] transition-colors"
          >
            {/* tier colour dot */}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: ticket.tier?.color ?? "var(--primary)",
              }}
            />
            {/* tier name + short ID */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text)] truncate">
                {ticket.tier?.name ?? "General Admission"}
              </p>
              <p className="text-xs text-[var(--muted)] font-mono">
                PP-{ticket.id.slice(-8).toUpperCase()}
              </p>
            </div>
            {/* status badge */}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                STATUS_COLORS[ticket.status] ?? "bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </span>
            {/* QR icon */}
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📱</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
