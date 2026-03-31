"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, X } from "lucide-react";
import { organizerApi, unwrap } from "@/lib/api";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

interface Venue {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  photos?: string[];
  city: string;
  address: string;
  capacity?: number;
  amenities?: string[];
  _count: { clubNights: number; clubMemberships: number };
}

interface ClubNight {
  id: string;
  name: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
  coverImageUrl?: string;
  isActive: boolean;
}

interface Booking {
  id: string;
  userId: string;
  tableName: string;
  tableType: string;
  partySize: number;
  minSpend: number;
  status: string;
  notes?: string;
  createdAt: string;
}

interface Member {
  id: string;
  plan: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BOOKING_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-gray-100 text-gray-500",
};

const MEMBER_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-600",
};

type Tab = "nights" | "bookings" | "members" | "edit";

export default function ClubVenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [nights, setNights] = useState<ClubNight[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<Tab>("nights");
  const [loading, setLoading] = useState(true);

  // Edit state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", address: "", city: "", capacity: "", amenities: "" });
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (!["ORGANIZER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace("/organizer");
      return;
    }

    Promise.all([
      organizerApi.myVenue(venueId).then((r) => {
        const v = unwrap<Venue>(r);
        setVenue(v);
        setEditForm({
          name: v.name || "",
          description: v.description || "",
          address: v.address || "",
          city: v.city || "",
          capacity: v.capacity?.toString() || "",
          amenities: (v.amenities || []).join(", "),
        });
      }),
      organizerApi.venueNights(venueId).then((r) => {
        const d = unwrap<ClubNight[] | { items?: ClubNight[] }>(r);
        setNights(Array.isArray(d) ? d : d.items ?? []);
      }),
      organizerApi.venueBookings(venueId).then((r) => {
        const d = unwrap<{ items: Booking[] }>(r);
        setBookings(d.items ?? []);
      }),
      organizerApi.venueMembers(venueId).then((r) => {
        const d = unwrap<{ items: Member[] }>(r);
        setMembers(d.items ?? []);
      }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card p-5 h-32 animate-pulse" />
        <div className="card p-5 h-48 animate-pulse" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center py-24">
        <p className="text-[var(--muted)]">Venue not found or you don't have access.</p>
        <Link href="/organizer/venues" className="btn-primary mt-4 !text-sm !py-2 !px-5">Back to Clubs</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/organizer/venues" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] mb-3 inline-block">
          ← Clubs & Venues
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {venue.logoUrl ? (
              <img src={venue.logoUrl} alt={venue.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-[var(--primary)]">{venue.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-black text-[var(--text)]">{venue.name}</h1>
              <button
                onClick={() => setTab("edit")}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
              >
                ✏️ Edit
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] mt-0.5">📍 {venue.address}, {venue.city}</p>
            {venue.description && (
              <p className="text-sm text-[var(--muted)] mt-2">{venue.description}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="card p-4 text-center">
            <p className="text-2xl font-black text-[var(--text)]">{venue.capacity?.toLocaleString() ?? "—"}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Capacity</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-black text-[var(--text)]">{nights.length}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Club Nights</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-black text-[var(--text)]">{members.length}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Members</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-[var(--border)]">
        {(["nights", "bookings", "members", "edit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {t}
            {t === "nights" && nights.length > 0 && (
              <span className="ml-1.5 text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded-full">{nights.length}</span>
            )}
            {t === "bookings" && bookings.length > 0 && (
              <span className="ml-1.5 text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded-full">{bookings.length}</span>
            )}
            {t === "members" && members.length > 0 && (
              <span className="ml-1.5 text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded-full">{members.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "nights" && (
        <div className="space-y-3">
          {nights.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🌙</div>
              <p className="text-[var(--muted)]">No club nights configured yet</p>
            </div>
          ) : nights.map((night) => (
            <div key={night.id} className="card p-4 flex items-start gap-4">
              {night.coverImageUrl ? (
                <img src={night.coverImageUrl} alt={night.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[var(--surface)] flex items-center justify-center flex-shrink-0 text-2xl">🎵</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[var(--text)]">{night.name}</p>
                  {!night.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {DAYS[night.dayOfWeek]} · {night.startTime}{night.endTime ? ` – ${night.endTime}` : ""}
                </p>
                {night.description && (
                  <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{night.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bookings" && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🪑</div>
              <p className="text-[var(--muted)]">No table bookings yet</p>
            </div>
          ) : bookings.map((b) => (
            <div key={b.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface)] flex items-center justify-center flex-shrink-0 text-lg">🪑</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[var(--text)]">{b.tableName} <span className="font-normal text-[var(--muted)]">({b.tableType})</span></p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Party of {b.partySize} · Min spend KES {Number(b.minSpend).toLocaleString()}
                </p>
                {b.notes && <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{b.notes}</p>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${BOOKING_COLORS[b.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">👥</div>
              <p className="text-[var(--muted)]">No members yet</p>
            </div>
          ) : members.map((m) => {
            const name = `${m.user.firstName} ${m.user.lastName}`.trim();
            const initials = `${m.user.firstName?.[0] ?? ""}${m.user.lastName?.[0] ?? ""}`.toUpperCase();
            return (
              <div key={m.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center font-bold text-sm text-[var(--muted)] flex-shrink-0">
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)]">{name}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{m.user.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${MEMBER_COLORS[m.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {m.plan}
                  </span>
                  <p className="text-xs text-[var(--muted)] mt-1">{m.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === "edit" && (
        <form
          className="space-y-5 max-w-lg"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setSaveMsg("");
            try {
              await api.patch(`/venues/${venueId}`, {
                name: editForm.name.trim(),
                description: editForm.description.trim() || undefined,
                address: editForm.address.trim(),
                city: editForm.city.trim(),
                capacity: editForm.capacity ? parseInt(editForm.capacity) : undefined,
                amenities: editForm.amenities.split(",").map((s) => s.trim()).filter(Boolean),
              });
              if (newPhotos.length > 0) {
                await Promise.all(
                  newPhotos.map((file) => {
                    const fd = new FormData();
                    fd.append("photo", file);
                    return api.post(`/venues/${venueId}/upload-photo`, fd, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                  })
                );
                setNewPhotos([]);
                setNewPreviews([]);
              }
              setSaveMsg("Saved!");
              const r = await organizerApi.myVenue(venueId);
              setVenue(unwrap<Venue>(r));
            } catch {
              setSaveMsg("Failed to save.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {/* Photos */}
          <div className="card p-5 space-y-4">
            <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Current Photos</h2>
            {venue.photos && venue.photos.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {venue.photos.map((src, i) => (
                  <div key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No photos yet</p>
            )}
            <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider pt-2">Add More Photos</h2>
            <div className="flex flex-wrap gap-3">
              {newPreviews.map((src, i) => (
                <div key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => {
                    setNewPhotos((p) => p.filter((_, idx) => idx !== i));
                    setNewPreviews((p) => p.filter((_, idx) => idx !== i));
                  }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add</span>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const merged = [...newPhotos, ...files].slice(0, 5);
                setNewPhotos(merged);
                setNewPreviews(merged.map((f) => URL.createObjectURL(f)));
              }}
            />
          </div>

          {/* Fields */}
          <div className="card p-5 space-y-4">
            <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Venue Info</h2>
            {(["name", "description", "address", "city", "capacity", "amenities"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-semibold text-[var(--text)] mb-1.5 capitalize">{field === "amenities" ? "Amenities (comma separated)" : field}</label>
                {field === "description" ? (
                  <textarea rows={3} value={editForm[field]} onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
                ) : (
                  <input type={field === "capacity" ? "number" : "text"} value={editForm[field]}
                    onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                )}
              </div>
            ))}
          </div>

          {saveMsg && <p className={`text-sm ${saveMsg === "Saved!" ? "text-green-500" : "text-red-500"}`}>{saveMsg}</p>}

          <button type="submit" disabled={saving}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}
    </div>
  );
}
