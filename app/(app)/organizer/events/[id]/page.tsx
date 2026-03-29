"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { eventsApi, organizerApi, teamApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtCurrency, fmtDate, fmtDateTime, fmtRelative } from "@/lib/utils";
import type { User, Event } from "@/types";
import toast from "react-hot-toast";

interface EventAnalytics {
  totalRevenue: number;
  ticketsSold: number;
  ordersCount: number;
  checkInsCount: number;
  tierBreakdown: TierStat[];
}

interface TierStat {
  id: string;
  name: string;
  tierType: string;
  price: number;
  sold: number;
  quantity: number;
  revenue: number;
}

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface EventStaffMember {
  id: string; // assignmentId
  role: string;
  gate?: { id: string; name: string } | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
}

interface Gate {
  id: string;
  name: string;
}

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

const ROLE_COLORS: Record<string, string> = {
  MANAGER: "bg-purple-100 text-purple-700",
  SCANNER: "bg-blue-100 text-blue-700",
  SECURITY: "bg-red-100 text-red-700",
  BOX_OFFICE: "bg-green-100 text-green-700",
  HOST: "bg-teal-100 text-teal-700",
  BARTENDER: "bg-amber-100 text-amber-700",
};

const STAFF_ROLES = ["SCANNER", "BOX_OFFICE", "HOST", "SECURITY", "BARTENDER", "MANAGER"] as const;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab({ eventId }: { eventId: string }) {
  const [staff, setStaff] = useState<EventStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const r = await teamApi.getEventStaff(eventId);
      const d = unwrap<EventStaffMember[] | { items: EventStaffMember[] }>(r);
      setStaff(Array.isArray(d) ? d : d.items ?? []);
    } catch {
      toast.error("Failed to load event staff");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function handleRemove(assignmentId: string, name: string) {
    if (!confirm(`Remove ${name} from this event?`)) return;
    try {
      await teamApi.removeStaff(eventId, assignmentId);
      toast.success("Staff removed");
      loadStaff();
    } catch {
      toast.error("Failed to remove staff");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card animate-pulse h-14" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--muted)]">
          {staff.length} staff member{staff.length !== 1 ? "s" : ""} assigned
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary !py-2 !px-4 !text-sm"
        >
          + Add Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-[var(--muted)] text-sm mb-3">No staff assigned yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary !py-2 !px-5 !text-sm"
          >
            Assign First Staff Member
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {staff.map((s) => {
              const name = `${s.user.firstName} ${s.user.lastName}`.trim();
              const contact = s.user.email ?? s.user.phone ?? "";
              const initials = getInitials(s.user.firstName, s.user.lastName);
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface)] flex items-center justify-center text-sm font-bold text-[var(--muted)] flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{name || "Unknown"}</p>
                    {contact && (
                      <p className="text-xs text-[var(--muted)] truncate">{contact}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${ROLE_COLORS[s.role] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {s.role}
                  </span>
                  {s.gate && (
                    <span className="text-xs text-[var(--muted)] flex-shrink-0">
                      {s.gate.name}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(s.id, name)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0 ml-2"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <AddStaffModal
          eventId={eventId}
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); loadStaff(); }}
        />
      )}
    </div>
  );
}

// ── Add Staff Modal ───────────────────────────────────────────────────────────

function AddStaffModal({
  eventId,
  onClose,
  onAdded,
}: {
  eventId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<StaffUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [role, setRole] = useState("SCANNER");
  const [gateId, setGateId] = useState("");
  const [gates, setGates] = useState<Gate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    teamApi.getEventGates(eventId)
      .then((r) => {
        const d = unwrap<Gate[]>(r);
        setGates(Array.isArray(d) ? d : []);
      })
      .catch(() => {});
  }, [eventId]);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setFound(null);
    setSearched(false);
    try {
      const r = await teamApi.searchStaff(search.trim());
      const d = unwrap<StaffUser[]>(r);
      const list = Array.isArray(d) ? d : [];
      setFound(list[0] ?? null);
      setSearched(true);
    } catch {
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!found) return;
    setSubmitting(true);
    try {
      await teamApi.assignStaff(eventId, {
        userId: found.id,
        role,
        ...(gateId ? { gateId } : {}),
      });
      toast.success("Staff assigned to event");
      onAdded();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to assign staff"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <div className="bg-[var(--bg)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Add Staff to Event</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] text-xl leading-none">
            ×
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input flex-1"
            placeholder="Email or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>

        {searched && !found && (
          <p className="text-sm text-[var(--muted)] mb-3">
            No staff member found. Add them to your team first from the
            <Link href="/organizer/team" className="text-[var(--primary)] font-medium ml-1">Team page</Link>.
          </p>
        )}

        {found && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Found user */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)]">
              <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                {getInitials(found.firstName, found.lastName)}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {found.firstName} {found.lastName}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {found.email ?? found.phone ?? ""}
                </p>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Role
              </label>
              <select
                className="input w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Gate */}
            {gates.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                  Gate (optional)
                </label>
                <select
                  className="input w-full"
                  value={gateId}
                  onChange={(e) => setGateId(e.target.value)}
                >
                  <option value="">No specific gate</option>
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full !py-3 disabled:opacity-60"
            >
              {submitting ? "Assigning…" : "Assign to Event"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  ONGOING: "bg-blue-100 text-blue-700",
  DRAFT: "bg-[var(--surface)] text-[var(--muted)]",
  PAST: "bg-[var(--surface)] text-[var(--muted)]",
  CANCELLED: "bg-red-100 text-red-600",
  SOLD_OUT: "bg-amber-100 text-amber-700",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-600",
  CANCELLED: "bg-[var(--surface)] text-[var(--muted)]",
  REFUNDED: "bg-blue-100 text-blue-700",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-[var(--text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="card animate-pulse h-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-20" />)}
      </div>
      <div className="card animate-pulse h-48" />
    </div>
  );
}

const EVENT_TABS = ["Overview", "Team"] as const;
type EventTab = (typeof EVENT_TABS)[number];

export default function OrganizerEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<EventTab>("Overview");

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ORGANIZER" && user.role !== "CLUB_OWNER") {
      router.replace("/");
      return;
    }

    Promise.all([
      eventsApi.get(id).then((r) => setEvent(unwrap<Event>(r))).catch(() => toast.error("Event not found")),
      organizerApi.eventAnalytics(id).then((r) => setAnalytics(unwrap<EventAnalytics>(r))).catch(() => {}),
      organizerApi.eventAttendees(id, { limit: 10 })
        .then((r) => {
          const d = unwrap<{ items: Attendee[] } | Attendee[]>(r);
          setAttendees(Array.isArray(d) ? d : d.items ?? []);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id, router]);

  async function handlePublish() {
    if (!event) return;
    setPublishing(true);
    try {
      await organizerApi.publishEvent(id);
      setEvent((prev) => prev ? { ...prev, status: "PUBLISHED" } : prev);
      toast.success("Event published!");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleCancel() {
    if (!event || !confirm("Cancel this event? This cannot be undone.")) return;
    setCancelling(true);
    try {
      await organizerApi.cancelEvent(id);
      setEvent((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
      toast.success("Event cancelled");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <Skeleton />;

  if (!event) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-[var(--muted)]">Event not found</p>
        <Link href="/organizer/events" className="btn-primary mt-4 !text-sm !py-2 !px-5">Back to Events</Link>
      </div>
    );
  }

  const canPublish = event.status === "DRAFT";
  const canCancel = event.status === "PUBLISHED" || event.status === "ONGOING";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-4">
        <Link href="/organizer" className="hover:text-[var(--text)]">Dashboard</Link>
        <span>/</span>
        <Link href="/organizer/events" className="hover:text-[var(--text)]">My Events</Link>
        <span>/</span>
        <span className="text-[var(--text)] font-medium truncate">{event.title}</span>
      </div>

      {/* Event header */}
      <div className="card overflow-hidden mb-6">
        <div className="relative h-56 bg-[var(--surface)]">
          {event.coverImageUrl ? (
            <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-[var(--primary)] to-rose-700">🎉</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-black text-2xl leading-tight mb-1">{event.title}</p>
                <p className="text-white/80 text-sm">
                  📅 {fmtDateTime(event.startDateTime)}
                </p>
                {event.venue && (
                  <p className="text-white/80 text-sm mt-0.5">📍 {event.venue.name}, {event.venue.city}</p>
                )}
              </div>
              <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full shadow ${STATUS_COLORS[event.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                {event.status}
              </span>
            </div>
          </div>
        </div>
        {/* Action buttons */}
        {(canPublish || canCancel) && (
          <div className="px-5 py-4 border-t border-[var(--border)] flex gap-3">
            {canPublish && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-60"
              >
                {publishing ? "Publishing…" : "Publish Event"}
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-5 py-2 rounded-full border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Cancel Event"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={fmtCurrency(analytics?.totalRevenue ?? 0)} />
        <StatCard label="Tickets Sold" value={(analytics?.ticketsSold ?? 0).toLocaleString()} />
        <StatCard label="Orders" value={(analytics?.ordersCount ?? 0).toLocaleString()} />
        <StatCard label="Check-ins" value={(analytics?.checkInsCount ?? 0).toLocaleString()} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6">
        {EVENT_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Team Tab */}
      {activeTab === "Team" && <TeamTab eventId={id} />}

      {/* Overview content */}
      {activeTab === "Overview" && <>

      {/* Ticket tier breakdown */}
      {analytics?.tierBreakdown && analytics.tierBreakdown.length > 0 && (
        <div className="card mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted)]">Ticket Tiers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="text-left px-5 py-3 font-semibold text-[var(--muted)] text-xs uppercase tracking-wider">Tier</th>
                  <th className="text-left px-5 py-3 font-semibold text-[var(--muted)] text-xs uppercase tracking-wider">Type</th>
                  <th className="text-right px-5 py-3 font-semibold text-[var(--muted)] text-xs uppercase tracking-wider">Price</th>
                  <th className="text-center px-5 py-3 font-semibold text-[var(--muted)] text-xs uppercase tracking-wider">Sold / Total</th>
                  <th className="text-right px-5 py-3 font-semibold text-[var(--muted)] text-xs uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {analytics.tierBreakdown.map((tier) => {
                  const pct = tier.quantity > 0 ? Math.min(100, (tier.sold / tier.quantity) * 100) : 0;
                  return (
                    <tr key={tier.id} className="hover:bg-[var(--surface)] transition-colors">
                      <td className="px-5 py-3 font-medium">{tier.name}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{tier.tierType}</td>
                      <td className="px-5 py-3 text-right">{fmtCurrency(tier.price)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-medium">{tier.sold} / {tier.quantity}</span>
                          <div className="w-24 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 90 ? "#EF4444" : pct >= 60 ? "#F59E0B" : "var(--primary)",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-[var(--primary)]">{fmtCurrency(tier.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent orders / attendees */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted)]">Recent Orders</h2>
        </div>
        {attendees.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[var(--muted)] text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {attendees.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-sm">{a.firstName} {a.lastName}</p>
                  {a.email && <p className="text-xs text-[var(--muted)]">{a.email}</p>}
                  <p className="text-xs text-[var(--muted)] mt-0.5">{fmtRelative(a.createdAt)}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[a.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {a.status}
                  </span>
                  <span className="font-bold text-sm">{fmtCurrency(a.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>}
    </div>
  );
}
