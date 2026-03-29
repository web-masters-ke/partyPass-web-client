"use client";
import { useEffect, useState, Suspense } from "react";
import { eventsApi, unwrap } from "@/lib/api";
import type { Event, PaginatedResponse } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { fmtDate, fmtTime, fmtCurrency } from "@/lib/utils";

const CATEGORIES = ["All","CLUB_NIGHT","FESTIVAL","CONCERT","COMEDY","SPORTS","BOAT_PARTY","ROOFTOP","POP_UP"];
const LABELS: Record<string,string> = {
  All:"All", CLUB_NIGHT:"🎵 Club Nights", FESTIVAL:"🎪 Festivals",
  CONCERT:"🎤 Concerts", COMEDY:"😂 Comedy", SPORTS:"⚽ Sports",
  BOAT_PARTY:"⛵ Boat Parties", ROOFTOP:"🏙️ Rooftop", POP_UP:"✨ Pop-up",
};
const FALLBACK = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80",
  "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
];

function EventGrid({ events }: { events: Event[] }) {
  const router = useRouter();
  if (events.length === 0) return (
    <div className="text-center py-24">
      <div className="text-6xl mb-4">🎈</div>
      <p className="font-bold text-xl text-[var(--text)] mb-2">No parties found</p>
      <p className="text-sm text-[var(--muted)]">Try a different category or search</p>
    </div>
  );

  const [hero, ...rest] = events;
  const heroImg = hero.coverImageUrl || FALLBACK[0];
  const heroMin = hero.ticketTiers?.length ? Math.min(...hero.ticketTiers.map((t) => t.price)) : null;

  return (
    <div className="space-y-6">
      {/* Hero event */}
      <div onClick={() => router.push(`/events/${hero.id}`)}
        className="cursor-pointer rounded-2xl overflow-hidden relative h-72 md:h-96 group shadow-xl">
        <img src={heroImg} alt={hero.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {/* Category badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-[var(--primary)] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
            {LABELS[hero.category]?.split(" ").slice(1).join(" ") || hero.category}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-white text-2xl md:text-3xl font-black leading-tight mb-2 drop-shadow">{hero.title}</h2>
          <div className="flex items-center gap-4 text-white/80 text-sm">
            <span>📅 {fmtDate(hero.startDateTime)}</span>
            <span>🕐 {fmtTime(hero.startDateTime)}</span>
            {hero.venue && <span>📍 {hero.venue.name}</span>}
          </div>
          {heroMin !== null && (
            <div className="mt-3 inline-block bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-sm px-4 py-1.5 rounded-full">
              From {heroMin === 0 ? "Free" : fmtCurrency(heroMin)}
            </div>
          )}
        </div>
      </div>

      {/* Rest of events grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rest.map((e, i) => {
            const img = e.coverImageUrl || FALLBACK[(i + 1) % FALLBACK.length];
            const minPrice = e.ticketTiers?.length ? Math.min(...e.ticketTiers.map((t) => t.price)) : null;
            return (
              <div key={e.id} onClick={() => router.push(`/events/${e.id}`)}
                className="cursor-pointer rounded-2xl overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all bg-[var(--card-bg)] border border-[var(--border)]">
                <div className="relative h-36 overflow-hidden">
                  <img src={img} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {minPrice !== null && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {minPrice === 0 ? "Free" : fmtCurrency(minPrice)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm leading-tight line-clamp-2 text-[var(--text)]">{e.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{fmtDate(e.startDateTime)}</p>
                  {e.venue && <p className="text-xs text-[var(--muted)] truncate">📍 {e.venue.name}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl h-72 bg-[var(--surface)] animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({length: 8}).map((_,i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-[var(--surface)] animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-36 bg-[var(--border)]" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-[var(--border)] rounded w-4/5" />
              <div className="h-3 bg-[var(--border)] rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartiesInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState(sp.get("q") || "");
  const [inputQ, setInputQ] = useState(sp.get("q") || "");

  useEffect(() => {
    setLoading(true);
    const params: Record<string,unknown> = { limit: 24 };
    if (category !== "All") params.category = category;
    if (q) params.search = q;
    eventsApi.list(params)
      .then((r) => setEvents((unwrap<PaginatedResponse<Event>>(r)).items ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [category, q]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[var(--text)] mb-1">Discover Parties 🎉</h1>
        <p className="text-[var(--muted)] text-sm">The hottest events in Nairobi and beyond</p>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setQ(inputQ); }} className="mb-5">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="input-base w-full pl-10 pr-4"
            placeholder="Search parties, artists, venues…"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
          />
          {inputQ && (
            <button type="button" onClick={() => { setInputQ(""); setQ(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] text-lg leading-none">×</button>
          )}
        </div>
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              category === c
                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            }`}>{LABELS[c]}</button>
        ))}
      </div>

      {loading ? <SkeletonGrid /> : <EventGrid events={events} />}
    </div>
  );
}

export default function PartiesPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--muted)]">Loading…</div>}>
      <PartiesInner />
    </Suspense>
  );
}
