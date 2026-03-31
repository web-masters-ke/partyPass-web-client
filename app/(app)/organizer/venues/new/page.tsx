"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, X } from "lucide-react";
import api from "@/lib/api";

export default function NewVenuePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    capacity: "",
    amenities: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);
    const newPreviews = newPhotos.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setError("Name, address, and city are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const amenities = form.amenities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.post("/venues", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        country: "Kenya",
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        amenities,
      });

      const venueId = res.data?.data?.id || res.data?.id;

      if (venueId && photos.length > 0) {
        await Promise.all(
          photos.map((file) => {
            const fd = new FormData();
            fd.append("photo", file);
            return api.post(`/venues/${venueId}/upload-photo`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          })
        );
      }

      router.push("/organizer/venues");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/organizer/venues"
          className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm"
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-black">Register Venue</h1>
          <p className="text-sm text-[var(--muted)]">
            Add a new club or venue you manage
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photos */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Photos
          </h2>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">Up to 5 photos. First photo is used as cover.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Venue Info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Venue Info
          </h2>
          <Field
            label="Venue Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Altitude The Club"
            required
          />
          <Field
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="What makes your venue special?"
            textarea
          />
        </div>

        {/* Location */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Location
          </h2>
          <Field
            label="Address *"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Street address"
            required
          />
          <Field
            label="City *"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="e.g. Nairobi"
            required
          />
        </div>

        {/* Details */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Details
          </h2>
          <Field
            label="Capacity"
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
            placeholder="Max number of guests"
            type="number"
          />
          <Field
            label="Amenities"
            name="amenities"
            value={form.amenities}
            onChange={handleChange}
            placeholder="Parking, VIP Lounge, Bar (comma separated)"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Registering..." : "Register Venue"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  textarea,
  type,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  type?: string;
}) {
  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
  return (
    <div>
      <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">
        {label}
      </label>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          type={type || "text"}
          className={inputClass}
        />
      )}
    </div>
  );
}
