"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizerApi, unwrap } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

interface Venue {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  city: string;
  address: string;
  capacity?: number;
  _count: { clubNights: number; clubMemberships: number };
}

function VenueCard({ venue }: { venue: Venue }) {
  const router = useRouter();
  const initials = venue.name.slice(0, 2).toUpperCase();
  return (
    <div
      className="card p-5 cursor-pointer hover:shadow-md transition-all"
      onClick={() => router.push(`/organizer/venues/${venue.id}`)}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {venue.logoUrl ? (
            <img src={venue.logoUrl} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-[var(--primary)]">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--text)] truncate">{venue.name}</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">📍 {venue.address}, {venue.city}</p>
        </div>
      </div>
      {venue.description && (
        <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">{venue.description}</p>
      )}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--border)]">
        <div className="text-center">
          <p className="text-lg font-black text-[var(--text)]">{venue.capacity?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-[var(--muted)]">Capacity</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-[var(--text)]">{venue._count.clubNights}</p>
          <p className="text-xs text-[var(--muted)]">Nights</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-[var(--text)]">{venue._count.clubMemberships}</p>
          <p className="text-xs text-[var(--muted)]">Members</p>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser<User>();
    if (!user) { router.replace("/login"); return; }
    if (!["CLUB_OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace("/organizer");
      return;
    }
    organizerApi.myVenues()
      .then((r) => {
        const d = unwrap<Venue[] | { items: Venue[] }>(r);
        setVenues(Array.isArray(d) ? d : d.items ?? []);
      })
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">My Clubs</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Venues you own and manage</p>
        </div>
        <Link href="/venues" className="btn-primary !py-2.5 !px-5 !text-sm">
          + Register Venue
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5 h-52 animate-pulse" />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🏛️</div>
          <p className="font-bold text-xl text-[var(--text)] mb-2">No venues yet</p>
          <p className="text-sm text-[var(--muted)] mb-6">Register a venue to start managing club nights and memberships</p>
          <Link href="/venues" className="btn-primary !text-sm !py-2.5 !px-6">
            Browse Venues
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
        </div>
      )}
    </div>
  );
}
