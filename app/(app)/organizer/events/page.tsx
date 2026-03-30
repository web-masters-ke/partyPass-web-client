"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizerApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import type { User } from "@/types";
import toast from "react-hot-toast";

interface OrganizerEvent {
  id: string;
  title: string;
  coverImageUrl?: string;
  startDateTime: string;
  status: string;
  venueName?: string;
  venueCity?: string;
  ticketsSold: number;
  capacity: number;
  revenue: number;
}

interface PaginatedEvents {
  items: OrganizerEvent[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  ONGOING: "bg-blue-100 text-blue-700",
  DRAFT: "bg-[var(--surface)] text-[var(--muted)]",
  PAST: "bg-[var(--surface)] text-[var(--muted)]",
  CANCELLED: "bg-red-100 text-red-600",
  SOLD_OUT: "bg-amber-100 text-amber-700",
};

type StatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "PAST";

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "PUBLISHED", label: "Published" },
  { key: "PAST", label: "Past" },
];

function EventCardSkeleton() {
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className="h-44 bg-[var(--surface)]" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-[var(--surface)] rounded w-3/4" />
        <div className="h-3 bg-[var(--surface)] rounded w-1/2" />
        <div className="h-2 bg-[var(--surface)] rounded mt-3" />
      </div>
    </div>
  );
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (!["ORGANIZER","ORGANIZER","ADMIN","SUPER_ADMIN"].includes(user.role)) {
      router.replace("/");
      return;
    }
  }, [router]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, limit: 12 };
    if (filter !== "ALL") params.status = filter;

    organizerApi.myEvents(params)
      .then((r) => {
        const d = unwrap<PaginatedEvents | OrganizerEvent[]>(r);
        if (Array.isArray(d)) {
          setEvents(d);
          setTotalPages(1);
          setTotal(d.length);
        } else {
          setEvents(d.items ?? []);
          setTotalPages(d.totalPages ?? 1);
          setTotal(d.total ?? 0);
        }
      })
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoading(false));
  }, [filter, page]);

  function handleFilterChange(f: StatusFilter) {
    setFilter(f);
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">My Events</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            {total > 0 ? `${total} event${total !== 1 ? "s" : ""}` : "No events yet"}
          </p>
        </div>
        <Link href="/organizer/events/new" className="btn-primary !py-2.5 !px-5 !text-sm">
          + Create Event
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--surface)] rounded-xl p-1 w-fit">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleFilterChange(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === t.key
                ? "bg-[var(--card-bg)] text-[var(--primary)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-medium text-[var(--muted)]">
            {filter === "ALL" ? "No events yet." : `No ${filter.toLowerCase()} events.`}
          </p>
          {filter === "ALL" && (
            <Link href="/organizer/events/new" className="btn-primary mt-4 !text-sm !py-2.5 !px-6">
              Create your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => {
            const soldPct = ev.capacity > 0 ? Math.min(100, (ev.ticketsSold / ev.capacity) * 100) : 0;
            return (
              <div
                key={ev.id}
                onClick={() => router.push(`/organizer/events/${ev.id}`)}
                className="card cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
              >
                {/* Cover image */}
                <div className="relative h-44 bg-[var(--surface)]">
                  {ev.coverImageUrl ? (
                    <img
                      src={ev.coverImageUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-[var(--primary)] to-rose-700">
                      🎉
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${STATUS_COLORS[ev.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                      {ev.status}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-black text-base leading-tight line-clamp-2">{ev.title}</p>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <p className="text-xs text-[var(--muted)] mb-1">
                    📅 {fmtDate(ev.startDateTime)}
                    {(ev.venueCity ?? ev.venueName) && ` · 📍 ${ev.venueCity ?? ev.venueName}`}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                      <span>{ev.ticketsSold ?? 0} sold</span>
                      <span>{ev.capacity ?? 0} capacity</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${soldPct}%`,
                          background: soldPct >= 90 ? "#EF4444" : soldPct >= 60 ? "#F59E0B" : "var(--primary)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--muted)]">Revenue</span>
                    <span className="font-bold text-sm text-[var(--primary)]">{fmtCurrency(ev.revenue ?? 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium disabled:opacity-40 hover:bg-[var(--surface)] transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted)]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium disabled:opacity-40 hover:bg-[var(--surface)] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
