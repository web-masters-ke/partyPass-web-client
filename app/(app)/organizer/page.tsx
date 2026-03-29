"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizerApi, teamApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtCurrency, fmtDate, fmtRelative } from "@/lib/utils";
import type { User } from "@/types";
import toast from "react-hot-toast";

interface WalletData {
  grossRevenue: number;
  platformFees: number;
  netEarnings: number;
  paidOut: number;
  inProgress: number;
  availableToWithdraw: number;
  currency: string;
}

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

interface Payout {
  id: string;
  amount: number;
  status: string;
  phone: string;
  requestedAt: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  staffRole?: string;
  isActive?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  ONGOING: "bg-blue-100 text-blue-700",
  DRAFT: "bg-[var(--surface)] text-[var(--muted)]",
  PAST: "bg-[var(--surface)] text-[var(--muted)]",
  CANCELLED: "bg-red-100 text-red-600",
  SOLD_OUT: "bg-amber-100 text-amber-700",
};

const PAYOUT_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  REJECTED: "bg-red-100 text-red-600",
  CANCELLED: "bg-[var(--surface)] text-[var(--muted)]",
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? "border-[var(--primary)] border-2" : ""}`}>
      <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black ${accent ? "text-[var(--primary)]" : "text-[var(--text)]"}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5 animate-pulse h-24" />
        ))}
      </div>
      <div className="card p-5 animate-pulse h-48 mb-6" />
      <div className="card p-5 animate-pulse h-32" />
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  MANAGER: "bg-purple-100 text-purple-700",
  SCANNER: "bg-blue-100 text-blue-700",
  SECURITY: "bg-red-100 text-red-700",
  BOX_OFFICE: "bg-green-100 text-green-700",
  HOST: "bg-teal-100 text-teal-700",
  BARTENDER: "bg-amber-100 text-amber-700",
};

export default function OrganizerDashboard() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ORGANIZER" && user.role !== "CLUB_OWNER") {
      router.replace("/");
      return;
    }

    Promise.all([
      organizerApi.wallet()
        .then((r) => setWallet(unwrap<WalletData>(r)))
        .catch(() => toast.error("Failed to load wallet")),
      organizerApi.myEvents({ limit: 5 })
        .then((r) => {
          const d = unwrap<{ items: OrganizerEvent[] } | OrganizerEvent[]>(r);
          setEvents(Array.isArray(d) ? d : d.items ?? []);
        })
        .catch(() => {}),
      organizerApi.payouts({ limit: 3 })
        .then((r) => {
          const d = unwrap<{ items: Payout[] } | Payout[]>(r);
          setPayouts(Array.isArray(d) ? d : d.items ?? []);
        })
        .catch(() => {}),
      teamApi.getMyTeam()
        .then((r) => {
          const d = unwrap<TeamMember[] | { items: TeamMember[] }>(r);
          setTeamMembers(Array.isArray(d) ? d : d.items ?? []);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [router]);

  if (loading) return <Skeleton />;

  const activeCount = events.filter((e) => e.status === "PUBLISHED" || e.status === "ONGOING").length;
  const totalTickets = events.reduce((s, e) => s + (e.ticketsSold ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">Organizer Dashboard</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Your events, earnings and payouts at a glance</p>
        </div>
        <Link href="/organizer/events/new" className="btn-primary !py-2.5 !px-5 !text-sm">
          + Create Event
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Revenue"
          value={fmtCurrency(wallet?.grossRevenue ?? 0)}
          sub="Gross ticket sales"
        />
        <StatCard
          label="Net Earnings"
          value={fmtCurrency(wallet?.netEarnings ?? 0)}
          sub="After 5% platform fee"
          accent
        />
        <StatCard
          label="Active Events"
          value={String(activeCount)}
          sub="Published or ongoing"
        />
        <StatCard
          label="Tickets Sold"
          value={totalTickets.toLocaleString()}
          sub="Across all events"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/organizer/events" className="card px-4 py-3 text-sm font-semibold flex items-center gap-2 hover:shadow-md transition-shadow">
          <span className="text-lg">📅</span> All Events
        </Link>
        <Link href="/organizer/wallet" className="card px-4 py-3 text-sm font-semibold flex items-center gap-2 hover:shadow-md transition-shadow">
          <span className="text-lg">💰</span> Wallet · {fmtCurrency(wallet?.availableToWithdraw ?? 0)}
        </Link>
      </div>

      {/* Recent events */}
      <div className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted)]">Recent Events</h2>
          <Link href="/organizer/events" className="text-xs font-semibold text-[var(--primary)]">View all</Link>
        </div>
        {events.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-[var(--muted)] text-sm">No events yet.</p>
            <Link href="/organizer/events/new" className="btn-primary mt-4 !text-sm !py-2 !px-5">Create your first event</Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                onClick={() => router.push(`/organizer/events/${ev.id}`)}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--surface)] overflow-hidden flex-shrink-0">
                  {ev.coverImageUrl ? (
                    <img src={ev.coverImageUrl} alt={ev.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-[var(--primary)] to-rose-700">🎉</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{ev.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {fmtDate(ev.startDateTime)}
                    {ev.venueCity ? ` · ${ev.venueCity}` : ev.venueName ? ` · ${ev.venueName}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[ev.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {ev.status}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{ev.ticketsSold ?? 0} sold</span>
                </div>
                <div className="text-right hidden md:block flex-shrink-0 w-24">
                  <p className="font-bold text-sm text-[var(--primary)]">{fmtCurrency(ev.revenue ?? 0)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent payouts */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted)]">Recent Payouts</h2>
          <Link href="/organizer/wallet" className="text-xs font-semibold text-[var(--primary)]">View wallet</Link>
        </div>
        {payouts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[var(--muted)] text-sm">No payout requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-bold text-sm">{fmtCurrency(p.amount)}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{p.phone} · {fmtRelative(p.requestedAt)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYOUT_COLORS[p.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team section */}
      <div className="card overflow-hidden mt-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted)]">My Team</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/organizer/team" className="text-xs font-semibold text-[var(--primary)]">
            Manage Team
          </Link>
        </div>
        {teamMembers.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-[var(--muted)] text-sm mb-3">No team members yet</p>
            <Link href="/organizer/team" className="btn-primary !text-sm !py-2 !px-5">
              Build Your Team
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {teamMembers.slice(0, 3).map((m) => {
              const name = `${m.firstName} ${m.lastName}`.trim();
              const initials = `${m.firstName?.[0] ?? ""}${m.lastName?.[0] ?? ""}`.toUpperCase() || "?";
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface)] flex items-center justify-center text-sm font-bold text-[var(--muted)] flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{name || "Unknown"}</p>
                  </div>
                  {m.staffRole && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${ROLE_COLORS[m.staffRole] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                      {m.staffRole}
                    </span>
                  )}
                </div>
              );
            })}
            {teamMembers.length > 3 && (
              <div className="px-5 py-3 text-xs text-[var(--muted)]">
                +{teamMembers.length - 3} more ·{" "}
                <Link href="/organizer/team" className="text-[var(--primary)] font-semibold">
                  View all
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
