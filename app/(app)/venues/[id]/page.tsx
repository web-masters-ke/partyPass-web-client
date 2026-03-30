"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { venuesApi, eventsApi, unwrap } from "@/lib/api";
import type { Venue, Event, PaginatedResponse } from "@/types";
import EventCard from "@/components/events/event-card";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80",
  "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
];

function getMapsUrl(venue: Venue) {
  if (venue.latitude && venue.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
  }
  const address = [venue.address, venue.city, venue.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function getEmbedUrl(venue: Venue) {
  if (venue.latitude && venue.longitude) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude - 0.005},${venue.latitude - 0.005},${venue.longitude + 0.005},${venue.latitude + 0.005}&layer=mapnik&marker=${venue.latitude},${venue.longitude}`;
  }
  const address = [venue.address, venue.city, venue.country].filter(Boolean).join(", ");
  return `https://www.openstreetmap.org/export/embed.html?query=${encodeURIComponent(address)}&layer=mapnik`;
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    Promise.all([
      venuesApi.get(id).then((r) => setVenue(unwrap<Venue>(r))).catch(() => {}),
      eventsApi.list({ venueId: id, limit: 12 })
        .then((r) => setEvents(unwrap<PaginatedResponse<Event>>(r).items))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-96 flex items-center justify-center text-[var(--muted)]">Loading…</div>;
  if (!venue) return <div className="text-center py-20 text-[var(--muted)]">Venue not found</div>;

  const fallback = FALLBACK_IMAGES[parseInt(id.slice(-2), 16) % FALLBACK_IMAGES.length];
  const photos = [venue.bannerUrl ?? fallback, ...(venue.photos ?? [])].filter(Boolean) as string[];
  const mapsUrl = getMapsUrl(venue);
  const embedUrl = getEmbedUrl(venue);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Photo gallery */}
      <div className="card overflow-hidden mb-6">
        <div className="relative h-64 md:h-80 bg-[var(--primary)]">
          {photos.length > 0 ? (
            <>
              <img
                src={photos[photoIdx]}
                alt={venue.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
              />
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? "bg-white scale-125" : "bg-white/50"}`} />
                  ))}
                </div>
              )}
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">‹</button>
                  <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">›</button>
                </>
              )}
            </>
          ) : null}
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            {venue.logoUrl && (
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0">
                <img src={venue.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-1">{venue.name}</h1>
              <p className="text-[var(--muted)]">📍 {venue.address}, {venue.city}, {venue.country}</p>
              {venue.capacity && <p className="text-sm text-[var(--muted)] mt-1">👥 Capacity: {venue.capacity.toLocaleString()}</p>}
            </div>
          </div>

          {venue.amenities?.length > 0 && (
            <div className="mt-5">
              <h3 className="font-bold text-sm mb-2">Amenities</h3>
              <div className="flex gap-2 flex-wrap">
                {venue.amenities.map((a) => (
                  <span key={a} className="text-sm bg-[var(--surface)] px-3 py-1 rounded-full text-[var(--muted)]">✓ {a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Embedded map */}
          <div className="mt-5 rounded-xl overflow-hidden border border-[var(--border)] h-48">
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              title={`Map of ${venue.name}`}
            />
          </div>

          {/* Directions — opens in new tab, stays in app */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text)] font-bold py-2.5 rounded-xl hover:bg-[var(--surface)] transition-colors text-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Open in Maps
          </a>
        </div>
      </div>

      {/* Upcoming events */}
      {events.length > 0 && (
        <div>
          <h2 className="text-xl font-black mb-4">Upcoming at {venue.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {events.map((e) => (
              <EventCard key={e.id} event={e} onClick={() => router.push(`/events/${e.id}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
