import type { Event } from "@/types";
import { fmtDate, fmtTime, fmtCurrency } from "@/lib/utils";

const CATEGORY_LABELS: Record<string,string> = {
  CLUB_NIGHT:"Club Night",FESTIVAL:"Festival",CONCERT:"Concert",
  COMEDY:"Comedy",SPORTS:"Sports",BOAT_PARTY:"Boat Party",
  ROOFTOP:"Rooftop",POP_UP:"Pop-up",CORPORATE:"Corporate",PRIVATE:"Private",
};

export default function EventCard({ event, onClick }: { event: Event; onClick?: () => void }) {
  const minPrice = event.ticketTiers?.length
    ? Math.min(...event.ticketTiers.map((t) => t.price))
    : null;

  return (
    <div onClick={onClick} className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group">
      {/* Cover */}
      <div className="relative h-36 bg-[var(--primary)] overflow-hidden">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-5xl">🎉</div>
        )}
        <div className="absolute top-2 left-2 bg-white/90 text-[var(--primary)] text-[10px] font-bold px-2 py-0.5 rounded-full">
          {CATEGORY_LABELS[event.category] ?? event.category}
        </div>
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-sm leading-tight line-clamp-2 mb-1">{event.title}</p>
        <p className="text-xs text-[var(--muted)]">{fmtDate(event.startDateTime)}</p>
        <p className="text-xs text-[var(--muted)]">{fmtTime(event.startDateTime)}</p>
        {event.venue && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{event.venue.name}</p>}
        {minPrice !== null && (
          <p className="text-xs font-bold text-[var(--primary)] mt-1">
            {minPrice === 0 ? "Free" : `From ${fmtCurrency(minPrice)}`}
          </p>
        )}
      </div>
    </div>
  );
}
