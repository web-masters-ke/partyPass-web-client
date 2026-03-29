"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { eventsApi, reviewsApi, unwrap } from "@/lib/api";
import type { Event, Review } from "@/types";
import { fmtDate, fmtTime, fmtCurrency } from "@/lib/utils";

const TIER_TYPE_LABELS: Record<string, string> = {
  GA: "General Admission",
  EARLY_BIRD: "Early Bird",
  VIP: "VIP",
  VVIP: "VVIP",
  TABLE: "Table",
  GROUP: "Group",
  BACKSTAGE: "Backstage",
  PRESS: "Press",
  COMP: "Complimentary",
};
import { isAuthenticated } from "@/lib/auth";
import toast from "react-hot-toast";

export default function PartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      eventsApi.get(id).then((r) => setEvent(unwrap<Event>(r))),
      reviewsApi.event(id).then((r) => setReviews(unwrap<Review[]>(r))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  function setQty(tierId: string, delta: number) {
    setQuantities((q) => ({ ...q, [tierId]: Math.max(0, (q[tierId] || 0) + delta) }));
  }

  function getTickets() {
    if (!isAuthenticated()) { router.push("/login"); return; }
    const selection = Object.entries(quantities).filter(([, v]) => v > 0);
    if (!selection.length) { toast.error("Select at least one ticket"); return; }
    const params = selection.map(([k, v]) => `${k}:${v}`).join(",");
    router.push(`/checkout/${id}?tiers=${params}`);
  }

  if (loading) return <div className="h-96 flex items-center justify-center text-[var(--muted)]">Loading…</div>;
  if (!event) return <div className="text-center py-20 text-[var(--muted)]">Party not found</div>;

  const total = event.ticketTiers?.reduce(
    (sum, tier) => sum + (quantities[tier.id] || 0) * tier.price, 0
  ) || 0;
  const hasSelection = Object.values(quantities).some((v) => v > 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover */}
      <div className="card overflow-hidden mb-6">
        <div className="h-64 md:h-80 bg-[var(--primary)] relative">
          {event.coverImageUrl
            ? <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-8xl text-white/30">🎉</div>
          }
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <span className="inline-block bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
              {event.category.replace(/_/g, " ")}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow">{event.title}</h1>
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)] mb-4">
            <span>📅 {fmtDate(event.startDateTime)}</span>
            <span>🕐 {fmtTime(event.startDateTime)}</span>
            {event.venue && <span>📍 {event.venue.name}, {event.venue.city}</span>}
            {event.ageRestriction ? <span>🔞 {event.ageRestriction}+</span> : null}
            {event.dressCode && <span>👔 {event.dressCode}</span>}
          </div>
          <p className="text-[var(--muted)] leading-relaxed">{event.description}</p>
          {event.genreTags?.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {event.genreTags.map((t) => (
                <span key={t} className="bg-[var(--surface)] text-xs px-3 py-1 rounded-full text-[var(--muted)]">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Ticket tiers */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-xl font-black mb-4">Get Tickets</h2>
          {event.ticketTiers?.map((tier) => {
            const remaining = tier.quantity - tier.sold;
            const qty = quantities[tier.id] || 0;
            const isSelected = qty > 0;
            const tierColor = tier.color ?? "var(--primary)";
            const soldOut = remaining === 0;
            return (
              <div
                key={tier.id}
                onClick={() => !soldOut && setQty(tier.id, qty === 0 ? 1 : 0)}
                className={`rounded-2xl overflow-hidden border transition-all ${soldOut ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}`}
                style={{
                  borderColor: isSelected ? tierColor : "var(--border)",
                  boxShadow: isSelected ? `0 0 0 2px ${tierColor}` : undefined,
                  background: isSelected ? `${tierColor}0d` : "var(--card-bg)",
                }}
              >
                <div className="flex">
                  {/* Colour strip */}
                  <div className="w-1.5 shrink-0" style={{ background: tierColor }} />

                  {/* Tier info */}
                  <div className="flex-1 p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm">{tier.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: tierColor }}>
                          {TIER_TYPE_LABELS[tier.tierType] ?? tier.tierType}
                        </span>
                        {soldOut && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">SOLD OUT</span>
                        )}
                      </div>
                      <p className="font-black text-lg" style={{ color: tierColor }}>
                        {tier.price === 0 ? "Free" : fmtCurrency(tier.price, tier.currency)}
                      </p>
                      {tier.perks?.length > 0 && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">{tier.perks.join(" · ")}</p>
                      )}
                      {remaining > 0 && remaining <= 20 && (
                        <p className="text-xs text-amber-500 font-medium mt-0.5">⚡ Only {remaining} left</p>
                      )}
                    </div>

                    {/* Quantity controls — stop propagation so ± doesn't toggle the card */}
                    {!soldOut && (
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setQty(tier.id, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center font-bold text-lg hover:bg-[var(--surface)] disabled:opacity-20 transition-colors"
                        >−</button>
                        <span className="w-6 text-center font-black tabular-nums text-base"
                          style={{ color: qty > 0 ? tierColor : "var(--muted)" }}>{qty}</span>
                        <button
                          onClick={() => setQty(tier.id, 1)}
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-lg transition-opacity hover:opacity-80"
                          style={{ background: tierColor }}
                        >+</button>
                      </div>
                    )}
                  </div>

                  {/* Checkmark when selected */}
                  {isSelected && (
                    <div className="flex items-center pr-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: tierColor }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {(!event.ticketTiers || event.ticketTiers.length === 0) && (
            <p className="text-[var(--muted)]">No tickets available yet.</p>
          )}
        </div>

        {/* Order summary */}
        <div>
          <div className="card overflow-hidden sticky top-20">
            {/* mini event banner */}
            <div className="h-28 relative bg-[var(--primary)]">
              {event.coverImageUrl ? (
                <img
                  src={event.coverImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🎉</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-2 left-3 right-3 text-white text-xs font-bold line-clamp-1">
                {event.title}
              </p>
            </div>

            <div className="p-4">
              <h3 className="font-bold mb-3">Order Summary</h3>
              {hasSelection ? (
                Object.entries(quantities).filter(([, v]) => v > 0).map(([tierId, qty]) => {
                  const tier = event.ticketTiers?.find((t) => t.id === tierId);
                  if (!tier) return null;
                  return (
                    <div key={tierId} className="flex justify-between text-sm mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: tier.color ?? "var(--primary)" }}
                        />
                        <span className="truncate">{tier.name} × {qty}</span>
                      </div>
                      <span className="font-medium flex-shrink-0 ml-2">
                        {fmtCurrency(tier.price * qty, tier.currency)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--muted)] text-center py-4">
                  Select tickets to see summary
                </p>
              )}
              {hasSelection && (
                <div className="border-t border-[var(--border)] pt-3 mt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{fmtCurrency(total)}</span>
                </div>
              )}
              <button
                onClick={getTickets}
                disabled={!hasSelection}
                className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasSelection ? `Get Tickets — ${fmtCurrency(total)}` : "Get Tickets"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-black mb-4">Reviews ({reviews.length})</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white text-sm font-bold flex items-center justify-center">
                    {r.user.firstName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.user.firstName} {r.user.lastName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </p>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-[var(--muted)]">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
