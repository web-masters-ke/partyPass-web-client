"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizerApi, venuesApi, mediaApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtCurrency } from "@/lib/utils";
import type { User, Venue } from "@/types";
import toast from "react-hot-toast";
import DateTimePicker from "@/components/shared/date-time-picker";

const EVENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "CLUB_NIGHT",  label: "Club Night" },
  { value: "CONCERT",     label: "Concert" },
  { value: "FESTIVAL",    label: "Festival" },
  { value: "COMEDY",      label: "Comedy" },
  { value: "SPORTS",      label: "Sports" },
  { value: "CORPORATE",   label: "Corporate" },
  { value: "PRIVATE",     label: "Private Party" },
  { value: "POP_UP",      label: "Pop-up" },
  { value: "BOAT_PARTY",  label: "Boat Party" },
  { value: "ROOFTOP",     label: "Rooftop" },
];

const TIER_TYPES = ["GA", "VIP", "EARLY_BIRD", "TABLE", "BACKSTAGE", "STUDENT", "COUPLE", "GROUP"];

interface TicketTierForm {
  key: string;
  name: string;
  tierType: string;
  price: string;
  quantity: string;
  description: string;
  saleStartDate: string;
  saleEndDate: string;
}

function makeTier(): TicketTierForm {
  return {
    key: Math.random().toString(36).slice(2),
    name: "",
    tierType: "GA",
    price: "",
    quantity: "",
    description: "",
    saleStartDate: "",
    saleEndDate: "",
  };
}

interface FormData {
  title: string;
  description: string;
  category: string;
  coverImageUrl: string;
  startDateTime: string;
  endDateTime: string;
  doorsOpenAt: string;
  venueId: string;
  customVenueName: string;
  customVenueCity: string;
  maxCapacity: string;
  dressCode: string;
  ageRestriction: string;
  isPrivate: boolean;
}

const INITIAL_FORM: FormData = {
  title: "",
  description: "",
  category: "CLUB_NIGHT",
  coverImageUrl: "",
  startDateTime: "",
  endDateTime: "",
  doorsOpenAt: "",
  venueId: "",
  customVenueName: "",
  customVenueCity: "",
  maxCapacity: "",
  dressCode: "",
  ageRestriction: "",
  isPrivate: false,
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [tiers, setTiers] = useState<TicketTierForm[]>([makeTier()]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [useCustomVenue, setUseCustomVenue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | string, string>>>({});
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverDragging, setCoverDragging] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    const canCreate = ["ORGANIZER", "CLUB_OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role);
    if (!canCreate) {
      toast.error("You need an organiser account to create events");
      router.replace("/");
      return;
    }
    venuesApi.list({ limit: 50 })
      .then((r) => {
        const d = unwrap<{ items: Venue[] } | Venue[]>(r);
        setVenues(Array.isArray(d) ? d : d.items ?? []);
      })
      .catch(() => {});
  }, [router]);

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  async function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setUploadingCover(true);
    try {
      const res = await mediaApi.upload(file, "events");
      const data = unwrap<{ url: string }>(res);
      set("coverImageUrl", data.url);
      toast.success("Cover image uploaded!");
    } catch {
      toast.error("Upload failed — check your connection");
    } finally {
      setUploadingCover(false);
    }
  }

  function setTier(key: string, field: keyof TicketTierForm, value: string) {
    setTiers((prev) => prev.map((t) => t.key === key ? { ...t, [field]: value } : t));
    setErrors((prev) => { const n = { ...prev }; delete n[`tier_${key}_${field}`]; return n; });
  }

  function addTier() {
    setTiers((prev) => [...prev, makeTier()]);
  }

  function removeTier(key: string) {
    if (tiers.length <= 1) { toast.error("Need at least one ticket tier"); return; }
    setTiers((prev) => prev.filter((t) => t.key !== key));
  }

  function validate(): boolean {
    const errs: Partial<Record<string, string>> = {};

    if (!form.title.trim()) errs.title = "Event title is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.startDateTime) errs.startDateTime = "Start date & time is required";
    if (!form.endDateTime) errs.endDateTime = "End date & time is required";
    if (form.startDateTime && form.endDateTime && form.endDateTime <= form.startDateTime) {
      errs.endDateTime = "End must be after start";
    }
    if (!useCustomVenue && !form.venueId) errs.venueId = "Select a venue or enter a custom one";
    if (useCustomVenue && !form.customVenueName.trim()) errs.customVenueName = "Venue name is required";
    if (!form.maxCapacity || Number(form.maxCapacity) < 1) errs.maxCapacity = "Enter a valid capacity";

    tiers.forEach((t) => {
      if (!t.name.trim()) errs[`tier_${t.key}_name`] = "Tier name required";
      if (!t.price || Number(t.price) < 0) errs[`tier_${t.key}_price`] = "Enter a valid price";
      if (!t.quantity || Number(t.quantity) < 1) errs[`tier_${t.key}_quantity`] = "Enter a valid quantity";
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) { toast.error("Please fix the errors below"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
        maxCapacity: Number(form.maxCapacity),
        isPrivate: form.isPrivate,
        ticketTiers: tiers.map((t) => ({
          name: t.name.trim(),
          tierType: t.tierType,
          price: Number(t.price),
          quantity: Number(t.quantity),
          description: t.description.trim() || undefined,
          saleStartDate: t.saleStartDate ? new Date(t.saleStartDate).toISOString() : undefined,
          saleEndDate: t.saleEndDate ? new Date(t.saleEndDate).toISOString() : undefined,
        })),
      };

      if (form.coverImageUrl.trim()) payload.coverImageUrl = form.coverImageUrl.trim();
      if (form.doorsOpenAt) payload.doorsOpenAt = new Date(form.doorsOpenAt).toISOString();
      if (form.dressCode.trim()) payload.dressCode = form.dressCode.trim();
      if (form.ageRestriction) payload.ageRestriction = Number(form.ageRestriction);

      if (useCustomVenue) {
        payload.venueName = form.customVenueName.trim();
        payload.venueCity = form.customVenueCity.trim() || undefined;
      } else {
        payload.venueId = form.venueId;
      }

      console.log("[CreateEvent] payload:", JSON.stringify(payload, null, 2));
      const res = await organizerApi.createEvent(payload);
      const created = unwrap<{ id: string }>(res);
      toast.success("Event created!");
      router.push(`/organizer/events/${created.id}`);
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { error?: { message?: string }; message?: string | string[] } } };
      const d = axiosErr?.response?.data;
      // Backend wraps errors as { success:false, error:{ message } } via HttpExceptionFilter
      const raw = d?.error?.message ?? d?.message;
      const msg = Array.isArray(raw) ? raw.join(" · ") : (raw || "Failed to create event");
      console.error("[CreateEvent] full error:", JSON.stringify(d, null, 2));
      toast.error(msg, { duration: 8000 });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-6">
        <Link href="/organizer" className="hover:text-[var(--text)]">Dashboard</Link>
        <span>/</span>
        <Link href="/organizer/events" className="hover:text-[var(--text)]">My Events</Link>
        <span>/</span>
        <span className="text-[var(--text)] font-medium">Create Event</span>
      </div>

      <h1 className="text-3xl font-black mb-2">Create Event</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Fill in the details to publish your event on PartyPass</p>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Event details */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-base border-b border-[var(--border)] pb-3">Event Details</h2>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Event Title *</label>
            <input
              type="text"
              className="input-base"
              placeholder="e.g. Afro Fridays Vol. 14"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              disabled={submitting}
              maxLength={120}
            />
            <FieldError msg={errors.title} />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Description *</label>
            <textarea
              className="input-base resize-none"
              rows={4}
              placeholder="Tell people what to expect at your event..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={submitting}
            />
            <FieldError msg={errors.description} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Category</label>
              <select
                className="input-base"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                disabled={submitting}
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Dress Code</label>
              <input
                type="text"
                className="input-base"
                placeholder="e.g. Smart casual"
                value={form.dressCode}
                onChange={(e) => set("dressCode", e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Cover Image</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
            />
            {form.coverImageUrl ? (
              <div className="relative rounded-xl overflow-hidden h-44 bg-[var(--surface)] group">
                <img src={form.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover || submitting}
                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    {uploadingCover ? "Uploading…" : "Change photo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => set("coverImageUrl", "")}
                    disabled={submitting}
                    className="bg-white/20 border border-white/40 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingCover && !submitting && coverInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setCoverDragging(true); }}
                onDragLeave={() => setCoverDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCoverDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) uploadCover(f);
                }}
                className={`h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
                  ${coverDragging ? "border-[var(--primary)] bg-rose-50" : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface)]"}
                  ${uploadingCover || submitting ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {uploadingCover ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--muted)]">Uploading…</p>
                  </div>
                ) : (
                  <>
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" className="text-[var(--muted)]">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[var(--text)]">Click to upload or drag & drop</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">JPEG, PNG, WebP · max 10 MB</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPrivate"
              checked={form.isPrivate}
              onChange={(e) => set("isPrivate", e.target.checked)}
              disabled={submitting}
              className="w-4 h-4 accent-[var(--primary)] rounded"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium">Private event (invite-only, hidden from browse)</label>
          </div>
        </div>

        {/* Date & time */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-base border-b border-[var(--border)] pb-3">Date & Time</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Start Date & Time *</label>
              <DateTimePicker
                value={form.startDateTime}
                onChange={(v) => set("startDateTime", v)}
                disabled={submitting}
                placeholder="Pick start date & time"
              />
              <FieldError msg={errors.startDateTime} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">End Date & Time *</label>
              <DateTimePicker
                value={form.endDateTime}
                onChange={(v) => set("endDateTime", v)}
                disabled={submitting}
                placeholder="Pick end date & time"
              />
              <FieldError msg={errors.endDateTime} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Doors Open Time</label>
            <DateTimePicker
              value={form.doorsOpenAt}
              onChange={(v) => set("doorsOpenAt", v)}
              disabled={submitting}
              placeholder="Optional — usually 30–60 min before start"
            />
          </div>
        </div>

        {/* Venue */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-base border-b border-[var(--border)] pb-3">Venue</h2>

          <div className="flex gap-3 mb-2">
            <button
              type="button"
              onClick={() => setUseCustomVenue(false)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                !useCustomVenue ? "border-[var(--primary)] text-[var(--primary)] bg-rose-50" : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              Select from list
            </button>
            <button
              type="button"
              onClick={() => setUseCustomVenue(true)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                useCustomVenue ? "border-[var(--primary)] text-[var(--primary)] bg-rose-50" : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              Custom venue
            </button>
          </div>

          {!useCustomVenue ? (
            <div>
              <label className="block text-sm font-semibold mb-1.5">Venue *</label>
              <select
                className="input-base"
                value={form.venueId}
                onChange={(e) => set("venueId", e.target.value)}
                disabled={submitting}
              >
                <option value="">— Select a venue —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}, {v.city}</option>
                ))}
              </select>
              <FieldError msg={errors.venueId} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Venue Name *</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. Nairobi Club"
                  value={form.customVenueName}
                  onChange={(e) => set("customVenueName", e.target.value)}
                  disabled={submitting}
                />
                <FieldError msg={errors.customVenueName} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">City</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. Nairobi"
                  value={form.customVenueCity}
                  onChange={(e) => set("customVenueCity", e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Max Capacity *</label>
              <input
                type="number"
                className="input-base"
                placeholder="e.g. 500"
                min={1}
                value={form.maxCapacity}
                onChange={(e) => set("maxCapacity", e.target.value)}
                disabled={submitting}
              />
              <FieldError msg={errors.maxCapacity} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Age Restriction</label>
              <input
                type="number"
                className="input-base"
                placeholder="e.g. 18"
                min={0}
                value={form.ageRestriction}
                onChange={(e) => set("ageRestriction", e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Ticket tiers */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="font-bold text-base">Ticket Tiers</h2>
            <button
              type="button"
              onClick={addTier}
              disabled={submitting}
              className="text-xs font-bold text-[var(--primary)] border border-[var(--primary)] px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              + Add Tier
            </button>
          </div>

          <div className="space-y-5">
            {tiers.map((tier, idx) => (
              <div key={tier.key} className="bg-[var(--surface)] rounded-xl p-4 space-y-4 relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-[var(--muted)]">Tier {idx + 1}</p>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(tier.key)}
                      disabled={submitting}
                      className="text-xs text-red-500 font-semibold hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tier Name *</label>
                    <input
                      type="text"
                      className="input-base !py-2.5 !text-sm"
                      placeholder="e.g. General Admission"
                      value={tier.name}
                      onChange={(e) => setTier(tier.key, "name", e.target.value)}
                      disabled={submitting}
                    />
                    <FieldError msg={errors[`tier_${tier.key}_name`]} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Type</label>
                    <select
                      className="input-base !py-2.5 !text-sm"
                      value={tier.tierType}
                      onChange={(e) => setTier(tier.key, "tierType", e.target.value)}
                      disabled={submitting}
                    >
                      {TIER_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Price (KES) *</label>
                    <input
                      type="number"
                      className="input-base !py-2.5 !text-sm"
                      placeholder="0 for free"
                      min={0}
                      value={tier.price}
                      onChange={(e) => setTier(tier.key, "price", e.target.value)}
                      disabled={submitting}
                    />
                    <FieldError msg={errors[`tier_${tier.key}_price`]} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Quantity *</label>
                    <input
                      type="number"
                      className="input-base !py-2.5 !text-sm"
                      placeholder="e.g. 200"
                      min={1}
                      value={tier.quantity}
                      onChange={(e) => setTier(tier.key, "quantity", e.target.value)}
                      disabled={submitting}
                    />
                    <FieldError msg={errors[`tier_${tier.key}_quantity`]} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Description (optional)</label>
                  <input
                    type="text"
                    className="input-base !py-2.5 !text-sm"
                    placeholder="e.g. Includes 1 free drink"
                    value={tier.description}
                    onChange={(e) => setTier(tier.key, "description", e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Sale Starts</label>
                    <DateTimePicker
                      value={tier.saleStartDate}
                      onChange={(v) => setTier(tier.key, "saleStartDate", v)}
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Sale Ends</label>
                    <DateTimePicker
                      value={tier.saleEndDate}
                      onChange={(v) => setTier(tier.key, "saleEndDate", v)}
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {tier.price && Number(tier.price) > 0 && tier.quantity && Number(tier.quantity) > 0 && (
                  <p className="text-xs text-[var(--muted)]">
                    Max revenue from this tier: <span className="font-bold text-[var(--primary)]">
                      {fmtCurrency(Number(tier.price) * Number(tier.quantity))}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 !py-3.5 text-base disabled:opacity-60"
          >
            {submitting ? "Creating Event…" : "Create Event"}
          </button>
          <Link
            href="/organizer/events"
            className="px-6 py-3.5 rounded-full border border-[var(--border)] text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
