"use client";
import { useEffect, useState } from "react";
import { venuesApi, unwrap } from "@/lib/api";
import type { Venue, PaginatedResponse } from "@/types";
import { useRouter } from "next/navigation";

// Curated fallback images for venues with no banner uploaded yet
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80", // DJ stage / club
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80", // nightclub crowd
  "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=600&q=80", // concert stage lights
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80", // concert crowd
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80", // nightclub lights
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80", // outdoor festival
];

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = { limit: 20 };
    if (q) params.search = q;
    venuesApi.list(params)
      .then((r) => setVenues(unwrap<PaginatedResponse<Venue>>(r).items ?? unwrap<Venue[]>(r)))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Venues 🏟️</h1>
        <p className="text-[var(--muted)]">Explore clubs, rooftops, arenas and more</p>
      </div>

      <div className="mb-6">
        <input className="input-base w-full" placeholder="Search venues…"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-52 animate-pulse bg-[var(--surface)]" />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted)]">
          <div className="text-5xl mb-3">🏟️</div>
          <p className="font-medium">No venues found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.map((venue, idx) => {
            const fallback = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
            const coverSrc = venue.bannerUrl || fallback;
            return (
            <div key={venue.id} onClick={() => router.push(`/venues/${venue.id}`)}
              className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden">
              <div className="h-36 relative overflow-hidden">
                <img src={coverSrc} alt={venue.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                {/* Dark overlay so name stays readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {venue.logoUrl && (
                  <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg overflow-hidden border-2 border-white bg-white">
                    <img src={venue.logoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-bold">{venue.name}</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">📍 {venue.city}</p>
                {venue.capacity && <p className="text-xs text-[var(--muted)] mt-0.5">👥 Capacity: {venue.capacity.toLocaleString()}</p>}
                {venue.amenities?.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {venue.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="text-xs bg-[var(--surface)] px-2 py-0.5 rounded-full text-[var(--muted)]">{a}</span>
                    ))}
                    {venue.amenities.length > 3 && <span className="text-xs text-[var(--muted)]">+{venue.amenities.length - 3} more</span>}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
