"use client";
import { useEffect, useState } from "react";
import { eventsApi, unwrap } from "@/lib/api";
import type { Event, PaginatedResponse } from "@/types";
import { fmtDate, fmtTime, fmtCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FALLBACK = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80",
  "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=600&q=80",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80",
];

function getWeekDays(): Date[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function ClubNightsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const weekDays = getWeekDays();

  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = { category: "CLUB_NIGHT", limit: 50 };
    if (selectedDate) params.date = selectedDate.toISOString().slice(0, 10);
    eventsApi.list(params)
      .then((r) => setEvents(unwrap<PaginatedResponse<Event>>(r).items ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [hero, ...rest] = events;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[var(--text)] mb-1">Club Nights 🎵</h1>
        <p className="text-[var(--muted)] text-sm">Find the hottest nights out this week</p>
      </div>

      {/* Week strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button onClick={() => setSelectedDate(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
            !selectedDate ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          }`}>All</button>
        {weekDays.map((d) => {
          const isToday = d.toDateString() === new Date().toDateString();
          const isSelected = selectedDate?.toDateString() === d.toDateString();
          const isPast = d < today;
          const isFriSat = d.getDay() === 5 || d.getDay() === 6;
          return (
            <button key={d.toISOString()} onClick={() => setSelectedDate(isSelected ? null : d)} disabled={isPast}
              className={`flex-shrink-0 w-14 py-2 rounded-xl border flex flex-col items-center text-xs font-medium transition-all relative ${
                isSelected ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : isToday ? "border-[var(--primary)] text-[var(--primary)]"
                : isPast ? "border-[var(--border)] text-[var(--muted)] opacity-30"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}>
              <span className="font-bold text-[10px]">{DAYS[d.getDay()]}</span>
              <span className="text-lg font-black leading-tight">{d.getDate()}</span>
              {isFriSat && !isPast && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--primary)]" />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="rounded-2xl h-56 animate-pulse bg-[var(--surface)]" />
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-2xl h-28 animate-pulse bg-[var(--surface)]"
              style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🌙</div>
          <p className="font-bold text-xl text-[var(--text)] mb-2">No club nights found</p>
          <p className="text-sm text-[var(--muted)]">Try a different day or check back later</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero event */}
          {hero && (
            <div onClick={() => router.push(`/events/${hero.id}`)}
              className="cursor-pointer rounded-2xl overflow-hidden relative h-56 group shadow-lg">
              <img
                src={hero.coverImageUrl || FALLBACK[0]}
                alt={hero.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full">Tonight's Pick</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white font-black text-xl leading-tight mb-1">{hero.title}</p>
                <div className="flex items-center gap-3 text-white/75 text-xs">
                  <span>📅 {fmtDate(hero.startDateTime)} · {fmtTime(hero.startDateTime)}</span>
                  {hero.venue && <span>📍 {hero.venue.name}</span>}
                </div>
                {hero.ticketTiers?.length ? (
                  <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm border border-white/25 text-white text-xs font-bold px-3 py-1 rounded-full">
                    From {fmtCurrency(Math.min(...hero.ticketTiers.map((t) => t.price)))}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Rest as cards */}
          {rest.map((e, i) => {
            const img = e.coverImageUrl || FALLBACK[(i + 1) % FALLBACK.length];
            const minPrice = e.ticketTiers?.length ? Math.min(...e.ticketTiers.map((t) => t.price)) : null;
            return (
              <div key={e.id} onClick={() => router.push(`/events/${e.id}`)}
                className="card cursor-pointer hover:shadow-md transition-all flex gap-0 overflow-hidden rounded-2xl">
                <div className="w-28 h-28 flex-shrink-0 relative overflow-hidden">
                  <img src={img} alt={e.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>
                <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-between">
                  <div>
                    <p className="font-bold leading-tight line-clamp-1 text-[var(--text)]">{e.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">{fmtDate(e.startDateTime)} · {fmtTime(e.startDateTime)}</p>
                    {e.venue && <p className="text-xs text-[var(--muted)]">📍 {e.venue.name}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {e.genreTags?.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] bg-[var(--surface)] px-2 py-0.5 rounded-full text-[var(--muted)] font-medium">{t}</span>
                      ))}
                      {e.dressCode && <span className="text-[10px] bg-[var(--surface)] px-2 py-0.5 rounded-full text-[var(--muted)]">👔 {e.dressCode}</span>}
                    </div>
                    {minPrice !== null && (
                      <span className="text-sm font-black text-[var(--primary)] flex-shrink-0 ml-2">
                        {minPrice === 0 ? "Free" : fmtCurrency(minPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
