"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Users, UserPlus, Search, ChevronDown, ChevronUp, X,
  Shield, Scan, CreditCard, Mic2, Wine, Settings2,
  CheckCircle, AlertTriangle, Clock, Eye, Edit3,
  Calendar, Hash, Phone, Mail, AlertCircle, MoreVertical,
  Activity, RefreshCw, Download, Filter,
} from "lucide-react";
import { teamApi, organizerApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────

const STAFF_ROLES = [
  { value: "MANAGER",    label: "Manager",    icon: Settings2,    color: "#7C3AED", bg: "#F5F3FF" },
  { value: "SCANNER",    label: "Scanner",    icon: Scan,         color: "#2563EB", bg: "#EFF6FF" },
  { value: "BOX_OFFICE", label: "Box Office", icon: CreditCard,   color: "#16A34A", bg: "#F0FDF4" },
  { value: "SECURITY",   label: "Security",   icon: Shield,       color: "#DC2626", bg: "#FEF2F2" },
  { value: "HOST",       label: "Host",       icon: Mic2,         color: "#0D9488", bg: "#F0FDFA" },
  { value: "BARTENDER",  label: "Bartender",  icon: Wine,         color: "#D97706", bg: "#FFFBEB" },
] as const;

const ROLE_DESCRIPTIONS: Record<string, string> = {
  MANAGER:    "Full event control — can override decisions, access all areas",
  SCANNER:    "QR code scanning at entry gates only",
  BOX_OFFICE: "Process walk-in ticket sales and payments",
  SECURITY:   "Access control and crowd management at all gates",
  HOST:       "Guest relations, VIP handling and front-of-house",
  BARTENDER:  "Bar access only, verify age via QR for alcohol service",
};

function getRoleMeta(value: string) {
  return STAFF_ROLES.find((r) => r.value === value) ?? STAFF_ROLES[1];
}

function RoleBadge({ role }: { role: string }) {
  const meta = getRoleMeta(role);
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: meta.bg, color: meta.color }}
    >
      <Icon size={10} />
      {meta.label}
    </span>
  );
}

function Avatar({
  firstName, lastName, avatarUrl, size = 36, role,
}: {
  firstName: string; lastName: string; avatarUrl?: string | null; size?: number; role?: string;
}) {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const color = role ? getRoleMeta(role).color : "#6B7280";
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={initials}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-green-500" : "bg-amber-400"}`}
      title={active ? "Active" : "Suspended"}
    />
  );
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Assignment {
  assignmentId: string;
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventStatus?: string;
  role: string;
  gateId?: string;
  gateName?: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive: boolean;
  avatarUrl?: string | null;
  badgeNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  staffNotes?: string;
  createdAt?: string;
  assignments?: Assignment[];
  stats?: { totalScans: number; eventsWorked: number };
}

interface TeamStats {
  total: number;
  active: number;
  suspended: number;
  roleBreakdown: Record<string, number>;
}

interface OrgEvent {
  id: string;
  title: string;
  startDateTime?: string;
  status?: string;
}

interface Gate {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────
// Staff Profile Drawer
// ─────────────────────────────────────────────

function StaffProfileDrawer({
  userId,
  events,
  onClose,
  onRefresh,
}: {
  userId: string;
  events: OrgEvent[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [profile, setProfile] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await teamApi.getMemberProfile(userId);
      const d = unwrap<TeamMember>(r);
      setProfile(d);
      setEditData({
        firstName: d.firstName ?? "",
        lastName: d.lastName ?? "",
        badgeNumber: d.badgeNumber ?? "",
        emergencyContactName: d.emergencyContactName ?? "",
        emergencyContactPhone: d.emergencyContactPhone ?? "",
        staffNotes: d.staffNotes ?? "",
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await teamApi.updateMemberProfile(userId, editData);
      toast.success("Profile saved");
      setEditing(false);
      load();
      onRefresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!profile) return;
    const next = !profile.isActive;
    if (!confirm(`${next ? "Activate" : "Suspend"} ${profile.firstName}?`)) return;
    setActionBusy(true);
    try {
      await teamApi.setMemberStatus(userId, next);
      toast.success(next ? "Activated" : "Suspended");
      load();
      onRefresh();
    } catch {
      toast.error("Failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemoveFromEvent(assignmentId: string, eventTitle: string) {
    const eventId = profile?.assignments?.find((a) => a.assignmentId === assignmentId)?.eventId;
    if (!eventId) return;
    if (!confirm(`Remove from "${eventTitle}"?`)) return;
    setRemoving(assignmentId);
    try {
      await teamApi.removeStaff(eventId, assignmentId);
      toast.success("Removed from event");
      load();
    } catch {
      toast.error("Failed to remove");
    } finally {
      setRemoving(null);
    }
  }

  async function handleChangeAssignmentRole(assignmentId: string, newRole: string) {
    try {
      await teamApi.changeAssignmentRole(assignmentId, newRole);
      toast.success("Role updated");
      load();
    } catch {
      toast.error("Failed");
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-[var(--bg)] h-full overflow-y-auto flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--bg)] h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--bg)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">Staff Profile</h2>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] font-medium hover:bg-[var(--surface)] transition-colors"
              >
                <Edit3 size={12} /> Edit
              </button>
            )}
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Profile summary */}
          <div className="flex items-start gap-4">
            <Avatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              avatarUrl={profile.avatarUrl}
              role={profile.role}
              size={56}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusDot active={profile.isActive} />
                <h3 className="font-bold text-xl">{fullName}</h3>
              </div>
              {profile.role && <RoleBadge role={profile.role} />}
              <p className="text-xs text-[var(--muted)] mt-1.5">
                Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-KE", { year: "numeric", month: "long" }) : "—"}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
              <p className="text-2xl font-black">{profile.stats?.eventsWorked ?? profile.assignments?.length ?? 0}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Events Worked</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
              <p className="text-2xl font-black">{profile.stats?.totalScans ?? 0}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Total Scans</p>
            </div>
          </div>

          {/* Edit form */}
          {editing ? (
            <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--surface)] p-5 space-y-4">
              <h4 className="font-semibold text-sm">Edit Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                {[["firstName", "First name"], ["lastName", "Last name"]].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">{label}</label>
                    <input
                      className="input w-full"
                      value={editData[key] ?? ""}
                      onChange={(e) => setEditData((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)] block mb-1">Badge / ID Number</label>
                <input
                  className="input w-full"
                  placeholder="e.g. PP-0042"
                  value={editData.badgeNumber ?? ""}
                  onChange={(e) => setEditData((d) => ({ ...d, badgeNumber: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--muted)] block mb-1">Emergency contact name</label>
                  <input
                    className="input w-full"
                    placeholder="Full name"
                    value={editData.emergencyContactName ?? ""}
                    onChange={(e) => setEditData((d) => ({ ...d, emergencyContactName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted)] block mb-1">Emergency phone</label>
                  <input
                    className="input w-full"
                    placeholder="07XXXXXXXX"
                    value={editData.emergencyContactPhone ?? ""}
                    onChange={(e) => setEditData((d) => ({ ...d, emergencyContactPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)] block mb-1">Organizer notes (private)</label>
                <textarea
                  className="input w-full min-h-[80px] resize-none"
                  placeholder="Private notes about this staff member..."
                  value={editData.staffNotes ?? ""}
                  onChange={(e) => setEditData((d) => ({ ...d, staffNotes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--muted)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 btn-primary !py-2.5 !text-sm disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            /* Contact & info cards */
            <div className="space-y-3">
              {/* Contact */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)] mb-3">Contact</h4>
                {profile.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail size={14} className="text-[var(--muted)] flex-shrink-0" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone size={14} className="text-[var(--muted)] flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.badgeNumber && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Hash size={14} className="text-[var(--muted)] flex-shrink-0" />
                    <span>Badge #{profile.badgeNumber}</span>
                  </div>
                )}
              </div>

              {/* Emergency contact */}
              {(profile.emergencyContactName || profile.emergencyContactPhone) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">Emergency Contact</h4>
                  {profile.emergencyContactName && (
                    <p className="text-sm font-medium">{profile.emergencyContactName}</p>
                  )}
                  {profile.emergencyContactPhone && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                      <Phone size={12} />
                      {profile.emergencyContactPhone}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {profile.staffNotes && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)] mb-2">Notes</h4>
                  <p className="text-sm text-[var(--muted)] italic">{profile.staffNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Event assignments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Event Assignments ({profile.assignments?.length ?? 0})</h4>
              <button
                onClick={() => setShowAssignModal(true)}
                className="text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                + Assign to Event
              </button>
            </div>
            {!profile.assignments?.length ? (
              <div className="rounded-xl border border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                Not assigned to any events yet.
              </div>
            ) : (
              <div className="space-y-2">
                {profile.assignments.map((a) => (
                  <div
                    key={a.assignmentId}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{a.eventTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RoleBadge role={a.role} />
                        {a.gateName && (
                          <span className="text-xs text-[var(--muted)]">· {a.gateName}</span>
                        )}
                        {a.eventDate && (
                          <span className="text-xs text-[var(--muted)]">
                            · {new Date(a.eventDate).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <select
                        className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--bg)] text-[var(--text)]"
                        defaultValue={a.role}
                        onChange={(e) => handleChangeAssignmentRole(a.assignmentId, e.target.value)}
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveFromEvent(a.assignmentId, a.eventTitle)}
                        disabled={removing === a.assignmentId}
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Remove from event"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-[var(--bg)] border-t border-[var(--border)] p-4 flex gap-3">
          <button
            onClick={handleToggleStatus}
            disabled={actionBusy}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50 ${
              profile.isActive
                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                : "border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            {actionBusy ? "…" : profile.isActive ? "Suspend Member" : "Activate Member"}
          </button>
        </div>

        {/* Assign to event sub-modal */}
        {showAssignModal && (
          <AssignToEventModal
            member={profile}
            events={events}
            onClose={() => setShowAssignModal(false)}
            onAssigned={() => { load(); setShowAssignModal(false); }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Assign to Event Modal
// ─────────────────────────────────────────────

function AssignToEventModal({
  member, events, onClose, onAssigned,
}: {
  member: TeamMember;
  events: OrgEvent[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [eventId, setEventId] = useState("");
  const [role, setRole] = useState("SCANNER");
  const [gateId, setGateId] = useState("");
  const [gates, setGates] = useState<Gate[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    teamApi.getEventGates(eventId)
      .then((r) => setGates(unwrap<Gate[]>(r) ?? []))
      .catch(() => setGates([]));
  }, [eventId]);

  async function handleAssign() {
    if (!eventId) return;
    setBusy(true);
    try {
      await teamApi.assignStaff(eventId, { userId: member.id, role, gateId: gateId || undefined });
      toast.success("Assigned successfully");
      onAssigned();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[var(--bg)] rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Assign to Event</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1">Event *</label>
            <select className="input w-full" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Select an event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">Role *</label>
            <div className="grid grid-cols-3 gap-2">
              {STAFF_ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-colors ${
                      role === r.value
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)]"
                    }`}
                    style={role === r.value ? { color: r.color } : { color: "var(--muted)" }}
                  >
                    <Icon size={16} />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          {gates.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--muted)] block mb-1">Gate (optional)</label>
              <select className="input w-full" value={gateId} onChange={(e) => setGateId(e.target.value)}>
                <option value="">Any gate</option>
                {gates.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--muted)]">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!eventId || busy}
              className="flex-1 btn-primary !py-2.5 !text-sm disabled:opacity-60"
            >
              {busy ? "Assigning…" : "Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Add Member Modal (full 3-step wizard)
// ─────────────────────────────────────────────

function AddMemberWizard({
  events,
  onClose,
  onAdded,
}: {
  events: OrgEvent[];
  onClose: () => void;
  onAdded: () => void;
}) {
  type Step = "search" | "create" | "assign";
  const [step, setStep] = useState<Step>("search");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TeamMember[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);

  // Create form
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    staffRole: "SCANNER",
    badgeNumber: "", emergencyContactName: "", emergencyContactPhone: "", staffNotes: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Assign
  const [assignments, setAssignments] = useState<Array<{ eventId: string; role: string; gateId: string }>>([
    { eventId: "", role: "SCANNER", gateId: "" },
  ]);
  const [gatesByEvent, setGatesByEvent] = useState<Record<string, Gate[]>>({});
  const [assigning, setAssigning] = useState(false);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setResults([]);
    setSearched(false);
    try {
      const r = await teamApi.searchStaff(search.trim());
      const d = unwrap<TeamMember[]>(r);
      setResults(Array.isArray(d) ? d : []);
      setSearched(true);
    } catch {
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectExisting(user: TeamMember) {
    setSelectedUser(user);
    setStep("assign");
  }

  function generatePassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!";
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setField("password", pwd);
    setShowPassword(true);
    toast.success("Password generated — save it now!");
  }

  async function handleCreate() {
    if (!form.firstName || !form.lastName) { toast.error("First and last name required"); return; }
    if (!form.email && !form.phone) { toast.error("Email or phone required"); return; }
    if (!form.password || form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setCreating(true);
    try {
      const r = await teamApi.createStaff({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password,
        staffRole: form.staffRole,
        badgeNumber: form.badgeNumber.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        staffNotes: form.staffNotes.trim() || undefined,
      });
      const d = unwrap<{ staff: TeamMember }>(r);
      toast.success("Staff account created");
      onAdded();
      setSelectedUser(d.staff ?? { id: "", firstName: form.firstName, lastName: form.lastName, isActive: true });
      setStep("assign");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  async function loadGates(eventId: string) {
    if (!eventId || gatesByEvent[eventId]) return;
    try {
      const r = await teamApi.getEventGates(eventId);
      setGatesByEvent((prev) => ({ ...prev, [eventId]: unwrap<Gate[]>(r) ?? [] }));
    } catch {
      setGatesByEvent((prev) => ({ ...prev, [eventId]: [] }));
    }
  }

  async function handleAssign() {
    const valid = assignments.filter((a) => a.eventId);
    if (!valid.length) { onAdded(); onClose(); return; }
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await Promise.all(
        valid.map((a) =>
          teamApi.assignStaff(a.eventId, {
            userId: selectedUser.id,
            role: a.role,
            gateId: a.gateId || undefined,
          })
        )
      );
      toast.success(`Assigned to ${valid.length} event${valid.length > 1 ? "s" : ""}`);
      onAdded();
      onClose();
    } catch {
      toast.error("Failed to assign to some events");
    } finally {
      setAssigning(false);
    }
  }

  const stepLabels = { search: "Find or Create", create: "Create Account", assign: "Assign to Events" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-[var(--bg)] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg">Add Team Member</h3>
            <p className="text-xs text-[var(--muted)]">{stepLabels[step]}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-[var(--muted)]" /></button>
        </div>

        {/* Step pills */}
        <div className="flex gap-2 px-6 pt-4 pb-2 flex-shrink-0">
          {(["search", "create", "assign"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-[var(--border)]" />}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-[var(--primary)] text-white"
                    : i < (step === "assign" ? 2 : step === "create" ? 1 : 0)
                    ? "bg-green-500 text-white"
                    : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-2">
          {/* Step 1: Search */}
          {step === "search" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Search for an existing PartyPass user by email, phone, or name, or create a new staff account.
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  className="input flex-1"
                  placeholder="Email, phone, or name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !search.trim()}
                  className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
                >
                  {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                </button>
              </div>

              {searched && results.length === 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-center text-[var(--muted)]">
                  No user found matching &quot;{search}&quot;
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-colors cursor-pointer"
                      onClick={() => handleSelectExisting(u)}
                    >
                      <Avatar firstName={u.firstName} lastName={u.lastName} avatarUrl={u.avatarUrl} size={38} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-[var(--muted)]">{u.email ?? u.phone ?? ""}</p>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">
                        Select
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() => setStep("create")}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--primary)]/40 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} /> Create new staff account
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create */}
          {step === "create" && (
            <div className="space-y-4">
              <button
                onClick={() => setStep("search")}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1 mb-2"
              >
                ← Back to search
              </button>

              <div className="grid grid-cols-2 gap-3">
                {(["firstName", "lastName"] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">
                      {key === "firstName" ? "First name" : "Last name"} *
                    </label>
                    <input
                      required
                      className="input w-full"
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--muted)] block mb-1">Email</label>
                  <input
                    type="email"
                    className="input w-full"
                    placeholder="staff@email.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted)] block mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input w-full"
                    placeholder="07XXXXXXXX"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--muted)] block mb-1">Password *</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input flex-1"
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="px-3 py-2 border border-[var(--border)] rounded-xl text-xs text-[var(--muted)]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 border border-[var(--border)] rounded-xl text-xs text-[var(--muted)] whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">Share this password with the staff member.</p>
              </div>

              {/* Default role */}
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">Default Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {STAFF_ROLES.map((r) => {
                    const Icon = r.icon;
                    const selected = form.staffRole === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setField("staffRole", r.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-colors ${
                          selected ? "border-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--text)]"
                        }`}
                        style={selected ? { background: r.bg, color: r.color } : { color: "var(--muted)" }}
                        title={ROLE_DESCRIPTIONS[r.value]}
                      >
                        <Icon size={18} />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {form.staffRole && (
                  <p className="text-xs text-[var(--muted)] mt-2 italic">{ROLE_DESCRIPTIONS[form.staffRole]}</p>
                )}
              </div>

              {/* Badge number */}
              <div>
                <label className="text-xs font-medium text-[var(--muted)] block mb-1">Badge / ID Number</label>
                <input
                  className="input w-full"
                  placeholder="e.g. PP-0042 (optional)"
                  value={form.badgeNumber}
                  onChange={(e) => setField("badgeNumber", e.target.value)}
                />
              </div>

              {/* Emergency contact */}
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Emergency Contact</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">Contact name</label>
                    <input
                      className="input w-full"
                      placeholder="Full name"
                      value={form.emergencyContactName}
                      onChange={(e) => setField("emergencyContactName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">Contact phone</label>
                    <input
                      type="tel"
                      className="input w-full"
                      placeholder="07XXXXXXXX"
                      value={form.emergencyContactPhone}
                      onChange={(e) => setField("emergencyContactPhone", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-[var(--muted)] block mb-1">Organizer Notes (private)</label>
                <textarea
                  className="input w-full min-h-[72px] resize-none"
                  placeholder="Internal notes about this staff member…"
                  value={form.staffNotes}
                  onChange={(e) => setField("staffNotes", e.target.value)}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full btn-primary !py-3 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <><RefreshCw size={14} className="animate-spin" /> Creating…</>
                ) : (
                  "Create Account & Continue"
                )}
              </button>
            </div>
          )}

          {/* Step 3: Assign */}
          {step === "assign" && selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <Avatar firstName={selectedUser.firstName} lastName={selectedUser.lastName} avatarUrl={selectedUser.avatarUrl} size={36} />
                <div>
                  <p className="font-semibold text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-xs text-[var(--muted)]">Ready to assign to events</p>
                </div>
                <CheckCircle size={18} className="ml-auto text-green-500" />
              </div>

              <p className="text-sm text-[var(--muted)]">
                Assign to one or more events (optional — you can do this later from the team page).
              </p>

              {assignments.map((a, idx) => (
                <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Assignment {idx + 1}</h5>
                    {assignments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAssignments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:bg-red-50 rounded-lg p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">Event</label>
                    <select
                      className="input w-full"
                      value={a.eventId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssignments((prev) => prev.map((x, i) => i === idx ? { ...x, eventId: val } : x));
                        loadGates(val);
                      }}
                    >
                      <option value="">— Select event —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">Role</label>
                    <div className="flex flex-wrap gap-2">
                      {STAFF_ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setAssignments((prev) => prev.map((x, i) => i === idx ? { ...x, role: r.value } : x))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            a.role === r.value
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                              : "border-[var(--border)] text-[var(--muted)]"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {a.eventId && (gatesByEvent[a.eventId]?.length ?? 0) > 0 && (
                    <div>
                      <label className="text-xs font-medium text-[var(--muted)] block mb-1">Gate (optional)</label>
                      <select
                        className="input w-full"
                        value={a.gateId}
                        onChange={(e) => setAssignments((prev) => prev.map((x, i) => i === idx ? { ...x, gateId: e.target.value } : x))}
                      >
                        <option value="">Any gate</option>
                        {(gatesByEvent[a.eventId] ?? []).map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setAssignments((prev) => [...prev, { eventId: "", role: "SCANNER", gateId: "" }])}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                + Add another event assignment
              </button>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--muted)]"
                >
                  Skip
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="flex-1 btn-primary !py-2.5 !text-sm disabled:opacity-60"
                >
                  {assigning ? "Assigning…" : assignments.some((a) => a.eventId) ? "Assign & Finish" : "Done"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// By Event Tab
// ─────────────────────────────────────────────

function ByEventTab({ events }: { events: OrgEvent[] }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [staff, setStaff] = useState<Array<{ assignmentId: string; role: string; gateId?: string; gateName?: string; user: TeamMember }>>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const loadStaff = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const r = await teamApi.getEventStaff(eventId);
      const d = unwrap<typeof staff>(r);
      setStaff(Array.isArray(d) ? d : []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(selectedEventId); }, [selectedEventId, loadStaff]);

  async function handleRemove(assignmentId: string) {
    if (!confirm("Remove this staff member from this event?")) return;
    setRemoving(assignmentId);
    try {
      await teamApi.removeStaff(selectedEventId, assignmentId);
      toast.success("Removed");
      loadStaff(selectedEventId);
    } catch {
      toast.error("Failed");
    } finally {
      setRemoving(null);
    }
  }

  async function handleChangeRole(assignmentId: string, newRole: string) {
    setChangingRole(assignmentId);
    try {
      await teamApi.changeAssignmentRole(assignmentId, newRole);
      toast.success("Role updated");
      loadStaff(selectedEventId);
    } catch {
      toast.error("Failed");
    } finally {
      setChangingRole(null);
    }
  }

  // Group by role
  const roleGroups: Record<string, typeof staff> = {};
  for (const s of staff) {
    if (!roleGroups[s.role]) roleGroups[s.role] = [];
    roleGroups[s.role].push(s);
  }

  // Identify missing critical roles
  const criticalRoles = ["MANAGER", "SECURITY", "SCANNER"];
  const missingCritical = criticalRoles.filter((r) => !roleGroups[r]?.length);

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-[var(--muted)] block mb-1">Select Event</label>
        <select
          className="input w-full max-w-sm"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <option value="">— Choose an event —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}{ev.startDateTime ? ` · ${new Date(ev.startDateTime).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}` : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId && missingCritical.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Missing critical roles: <strong>{missingCritical.join(", ")}</strong>.
            Assign staff before the event starts.
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
          ))}
        </div>
      ) : !selectedEventId ? (
        <div className="card py-16 text-center">
          <Calendar size={32} className="text-[var(--muted)] mx-auto mb-3" />
          <p className="text-[var(--muted)] text-sm">Select an event to view its staff roster</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="card py-16 text-center">
          <Users size={32} className="text-[var(--muted)] mx-auto mb-3" />
          <p className="text-[var(--muted)] text-sm mb-1">No staff assigned to this event yet.</p>
          <p className="text-xs text-[var(--muted)]">Add staff from the team page or member profiles.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--muted)]">
              {staff.length} staff member{staff.length !== 1 ? "s" : ""} · {Object.keys(roleGroups).length} roles
            </p>
          </div>
          {Object.entries(roleGroups).map(([role, members]) => (
            <div key={role}>
              <div className="flex items-center gap-2 mb-3">
                <RoleBadge role={role} />
                <span className="text-xs text-[var(--muted)]">{members.length} member{members.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {members.map((s) => (
                  <div
                    key={s.assignmentId}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                  >
                    <Avatar firstName={s.user.firstName} lastName={s.user.lastName} avatarUrl={s.user.avatarUrl} size={36} role={s.role} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {s.user.firstName} {s.user.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                        {(s.user.email ?? s.user.phone) && <span>{s.user.email ?? s.user.phone}</span>}
                        {s.gateName && <span>· {s.gateName}</span>}
                      </div>
                    </div>
                    <select
                      className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--bg)] text-[var(--text)]"
                      defaultValue={s.role}
                      disabled={changingRole === s.assignmentId}
                      onChange={(e) => handleChangeRole(s.assignmentId, e.target.value)}
                    >
                      {STAFF_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemove(s.assignmentId)}
                      disabled={removing === s.assignmentId}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function TeamManagementPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "byevent">("all");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, statsRes] = await Promise.all([
        teamApi.getMyTeam(),
        teamApi.getTeamStats(),
      ]);
      const d = unwrap<TeamMember[] | { items: TeamMember[] }>(teamRes);
      setMembers(Array.isArray(d) ? d : d.items ?? []);
      setStats(unwrap<TeamStats>(statsRes));
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ORGANIZER" && user.role !== "CLUB_OWNER") { router.replace("/"); return; }

    load();
    organizerApi.myEvents({ limit: 100 })
      .then((r) => {
        const d = unwrap<{ items: OrgEvent[] } | OrgEvent[]>(r);
        setEvents(Array.isArray(d) ? d : d.items ?? []);
      })
      .catch(() => {});
  }, [router, load]);

  async function handleToggleStatus(m: TeamMember) {
    const next = !m.isActive;
    if (!confirm(`${next ? "Activate" : "Suspend"} ${m.firstName} ${m.lastName}?`)) return;
    setActionId(m.id);
    try {
      await teamApi.setMemberStatus(m.id, next);
      toast.success(next ? "Activated" : "Suspended");
      load();
    } catch {
      toast.error("Failed");
    } finally {
      setActionId(null);
    }
  }

  const filtered = members.filter((m) => {
    if (roleFilter !== "ALL" && m.assignments?.every((a) => a.role !== roleFilter) && !m.role?.includes(roleFilter)) return false;
    if (statusFilter === "ACTIVE" && !m.isActive) return false;
    if (statusFilter === "SUSPENDED" && m.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      const phone = m.phone ?? "";
      const badge = m.badgeNumber ?? "";
      if (!fullName.includes(q) && !email.includes(q) && !phone.includes(q) && !badge.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const primaryRole = (m: TeamMember) => {
    if (!m.assignments?.length) return m.role ?? "";
    const roleCounts: Record<string, number> = {};
    for (const a of m.assignments) roleCounts[a.role] = (roleCounts[a.role] ?? 0) + 1;
    return Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? m.role ?? "";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface)]" />)}
        </div>
        {[0,1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface)]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-1.5">
            <Link href="/organizer" className="hover:text-[var(--text)]">Dashboard</Link>
            <span>/</span>
            <span className="text-[var(--text)] font-medium">My Team</span>
          </div>
          <h1 className="text-3xl font-black">My Team</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Manage staff, assign roles, and control event access
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowAddWizard(true)}
            className="btn-primary !py-2.5 !px-5 flex items-center gap-2"
          >
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: stats?.total ?? members.length, icon: Users, color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10" },
          { label: "Active", value: stats?.active ?? members.filter((m) => m.isActive).length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Suspended", value: stats?.suspended ?? members.filter((m) => !m.isActive).length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Events Covered", value: events.length, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4 p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-[var(--muted)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Role breakdown ── */}
      {stats?.roleBreakdown && Object.keys(stats.roleBreakdown).length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Roles Distribution</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.roleBreakdown).map(([role, count]) => {
              const meta = getRoleMeta(role);
              const Icon = meta.icon;
              return (
                <div
                  key={role}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                >
                  <Icon size={13} style={{ color: meta.color }} />
                  <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-xs font-bold text-[var(--text)] bg-[var(--bg)] rounded-full px-2 py-0.5 border border-[var(--border)]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex border-b border-[var(--border)] gap-1">
        {[
          { key: "all", label: `All Members (${members.length})` },
          { key: "byevent", label: "By Event" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── All Members tab ── */}
      {tab === "all" && (
        <div className="space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                className="input pl-9 w-full"
                placeholder="Search by name, email, phone, badge…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-full sm:w-36"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">All status</option>
              <option value="ACTIVE">Active only</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Role filter chips */}
          <div className="flex gap-2 flex-wrap">
            {["ALL", ...STAFF_ROLES.map((r) => r.value)].map((r) => {
              const meta = r !== "ALL" ? getRoleMeta(r) : null;
              const count = r === "ALL"
                ? members.length
                : members.filter((m) => m.assignments?.some((a) => a.role === r) || m.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    roleFilter === r
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--text)]"
                  }`}
                >
                  {r === "ALL" ? "All Roles" : (meta?.label ?? r)}
                  <span className="ml-1.5 opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Members */}
          {filtered.length === 0 ? (
            <div className="card py-16 text-center">
              <Users size={40} className="text-[var(--muted)] mx-auto mb-4" />
              <p className="font-semibold text-[var(--text)] mb-1">
                {search || roleFilter !== "ALL" || statusFilter !== "ALL"
                  ? "No members match your filters"
                  : "No team members yet"}
              </p>
              <p className="text-sm text-[var(--muted)] mb-5">
                {search || roleFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try clearing your search or filters."
                  : "Add staff to manage gate access, box office, and event operations."}
              </p>
              {roleFilter === "ALL" && !search && statusFilter === "ALL" && (
                <button onClick={() => setShowAddWizard(true)} className="btn-primary !py-2 !px-5 !text-sm inline-flex items-center gap-2">
                  <UserPlus size={14} /> Add First Member
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => {
                const isExpanded = expandedId === m.id;
                const role = primaryRole(m);
                const busy = actionId === m.id;
                const fullName = `${m.firstName} ${m.lastName}`.trim();

                return (
                  <div
                    key={m.id}
                    className={`card overflow-hidden transition-all ${!m.isActive ? "opacity-70" : ""}`}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-3 p-4">
                      <Avatar firstName={m.firstName} lastName={m.lastName} avatarUrl={m.avatarUrl} role={role} size={42} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold truncate max-w-[180px]">{fullName}</span>
                          <StatusDot active={m.isActive} />
                          {!m.isActive && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Suspended</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {role && <RoleBadge role={role} />}
                          {m.badgeNumber && (
                            <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                              <Hash size={9} /> {m.badgeNumber}
                            </span>
                          )}
                          <span className="text-xs text-[var(--muted)]">
                            {m.assignments?.length ?? 0} event{(m.assignments?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{m.email ?? m.phone ?? ""}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setProfileUserId(m.id)}
                          className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] transition-colors"
                          title="View full profile"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] transition-colors"
                          title={isExpanded ? "Collapse" : "Expand assignments"}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <div className="relative group">
                          <button className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] transition-colors">
                            <MoreVertical size={14} />
                          </button>
                          {/* Dropdown */}
                          <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl z-10 overflow-hidden hidden group-hover:block">
                            <button
                              onClick={() => setProfileUserId(m.id)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface)] flex items-center gap-2"
                            >
                              <Edit3 size={12} /> Edit Profile
                            </button>
                            <button
                              onClick={() => handleToggleStatus(m)}
                              disabled={busy}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface)] flex items-center gap-2 ${m.isActive ? "text-amber-700" : "text-green-700"}`}
                            >
                              {m.isActive ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                              {m.isActive ? "Suspend" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: assignments list */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                        {!m.assignments?.length ? (
                          <p className="text-xs text-[var(--muted)] text-center py-3">Not assigned to any events.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                              Event Assignments
                            </p>
                            {m.assignments.map((a) => (
                              <div
                                key={a.assignmentId}
                                className="flex items-center gap-3 bg-[var(--bg)] rounded-lg border border-[var(--border)] p-2.5"
                              >
                                <RoleBadge role={a.role} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{a.eventTitle}</p>
                                  <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                                    {a.gateName && <span>{a.gateName}</span>}
                                    {a.eventDate && (
                                      <span>{a.gateName ? "·" : ""} {new Date(a.eventDate).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setProfileUserId(m.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] font-medium hover:bg-[var(--bg)] transition-colors"
                          >
                            View Full Profile
                          </button>
                          <button
                            onClick={() => handleToggleStatus(m)}
                            disabled={busy}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-50 transition-colors ${
                              m.isActive
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-green-200 text-green-700 hover:bg-green-50"
                            }`}
                          >
                            {busy ? "…" : m.isActive ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── By Event tab ── */}
      {tab === "byevent" && <ByEventTab events={events} />}

      {/* ── Modals ── */}
      {showAddWizard && (
        <AddMemberWizard
          events={events}
          onClose={() => setShowAddWizard(false)}
          onAdded={load}
        />
      )}
      {profileUserId && (
        <StaffProfileDrawer
          userId={profileUserId}
          events={events}
          onClose={() => setProfileUserId(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
