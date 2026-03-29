"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizerApi, venuesApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtCurrency } from "@/lib/utils";
import type { User, Venue } from "@/types";
import toast from "react-hot-toast";

const EVENT_CATEGORIES = [
  "MUSIC", "CLUBBING", "FESTIVAL", "COMEDY", "ART", "FOOD_AND_DRINK",
  "SPORTS", "NETWORKING", "CULTURE", "THEATRE", "WELLNESS", "OTHER",
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
  category: "MUSIC",
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
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ORGANIZER" && user.role !== "CLUB_OWNER") {
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

      const res = await organizerApi.createEvent(payload);
      const created = unwrap<{ id: string }>(res);
      toast.success("Event created!");
      router.push(`/organizer/events/${created.id}`);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to create event"
      );
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
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
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
            <label className="block text-sm font-semibold mb-1.5">Cover Image URL</label>
            <input
              type="url"
              className="input-base"
              placeholder="https://..."
              value={form.coverImageUrl}
              onChange={(e) => set("coverImageUrl", e.target.value)}
              disabled={submitting}
            />
            {form.coverImageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden h-32 bg-[var(--surface)]">
                <img src={form.coverImageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs text-[var(--muted)] mt-1">Paste a direct image URL (JPEG, PNG, WebP)</p>
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
              <input
                type="datetime-local"
                className="input-base"
                value={form.startDateTime}
                onChange={(e) => set("startDateTime", e.target.value)}
                disabled={submitting}
              />
              <FieldError msg={errors.startDateTime} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">End Date & Time *</label>
              <input
                type="datetime-local"
                className="input-base"
                value={form.endDateTime}
                onChange={(e) => set("endDateTime", e.target.value)}
                disabled={submitting}
              />
              <FieldError msg={errors.endDateTime} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Doors Open Time</label>
            <input
              type="datetime-local"
              className="input-base"
              value={form.doorsOpenAt}
              onChange={(e) => set("doorsOpenAt", e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-[var(--muted)] mt-1">Usually 30–60 min before the event starts</p>
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
                    <input
                      type="datetime-local"
                      className="input-base !py-2.5 !text-sm"
                      value={tier.saleStartDate}
                      onChange={(e) => setTier(tier.key, "saleStartDate", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Sale Ends</label>
                    <input
                      type="datetime-local"
                      className="input-base !py-2.5 !text-sm"
                      value={tier.saleEndDate}
                      onChange={(e) => setTier(tier.key, "saleEndDate", e.target.value)}
                      disabled={submitting}
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
