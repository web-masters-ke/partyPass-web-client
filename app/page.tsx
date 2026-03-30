"use client";
import { useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/navbar";
import { isAuthenticated } from "@/lib/auth";

// ── Scroll-reveal ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(40px)";
    el.style.transition = `opacity 1s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 1s cubic-bezier(.22,1,.36,1) ${delay}ms`;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "none"; obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}

// ── Dark feature section ──────────────────────────────────────────────────────
// All sections share the same near-black bg so boundaries disappear.
// Top & bottom bleeds merge adjacent sections seamlessly.
const DARK = "#0E0E0E";
const DARK_RGBA_STRONG = "rgba(14,14,14,0.94)";
const DARK_RGBA_MID    = "rgba(14,14,14,0.5)";
const DARK_RGBA_NONE   = "rgba(14,14,14,0)";

type FS = {
  img: string; side?: "left" | "right";
  label: string; heading: ReactNode; body: string;
  bullets?: string[]; stats?: { v: string; l: string }[];
  cta?: { href: string; label: string };
};

function FS({ img, side = "right", label, heading, body, bullets, stats, cta }: FS) {
  const grad = side === "right"
    ? `linear-gradient(to right, ${DARK_RGBA_STRONG} 35%, ${DARK_RGBA_MID} 58%, ${DARK_RGBA_NONE} 100%)`
    : `linear-gradient(to left, ${DARK_RGBA_STRONG} 35%, ${DARK_RGBA_MID} 58%, ${DARK_RGBA_NONE} 100%)`;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: DARK }}>
      {/* Full-bleed image */}
      <img src={img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-65" />

      {/* Directional fade so text side reads cleanly */}
      <div className="absolute inset-0" style={{ background: grad }} />

      {/* Top bleed — merges with previous section */}
      <div className="absolute top-0 inset-x-0 h-28 pointer-events-none z-[2]"
        style={{ background: `linear-gradient(to bottom, ${DARK}, ${DARK_RGBA_NONE})` }} />

      {/* Bottom bleed — merges with next section */}
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none z-[2]"
        style={{ background: `linear-gradient(to top, ${DARK}, ${DARK_RGBA_NONE})` }} />

      <div className={`relative z-10 max-w-6xl mx-auto px-8 py-28 w-full ${side === "left" ? "flex justify-end" : ""}`}>
        <Reveal className="max-w-[520px]">
          <p className="text-[var(--primary)] text-xs font-black uppercase tracking-[0.2em] mb-5">{label}</p>
          <h2 className="text-5xl md:text-[3.2rem] font-black leading-[1.05] text-white mb-6">{heading}</h2>
          <p className="text-base md:text-lg leading-relaxed mb-8 text-white/65">{body}</p>

          {bullets && (
            <ul className="space-y-3 mb-8">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5L8 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className="text-sm text-white/65 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          )}

          {stats && (
            <div className="space-y-3.5 mb-8">
              {stats.map((s) => (
                <div key={s.v} className="flex items-baseline gap-4">
                  <span className="text-xl font-black text-[var(--primary)]" style={{ minWidth: "6.5rem" }}>{s.v}</span>
                  <span className="text-sm text-white/60">{s.l}</span>
                </div>
              ))}
            </div>
          )}

          {cta && (
            <Link href={cta.href}
              className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold px-7 py-3.5 rounded-full transition-colors">
              {cta.label} →
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}

// ── Loyalty tiers ─────────────────────────────────────────────────────────────
const TIERS = [
  { n: "Bronze",   c: "#CD7F32", pts: 0,     p: "Early access to events" },
  { n: "Silver",   c: "#C0C0C0", pts: 500,   p: "5% ticket discount" },
  { n: "Gold",     c: "#FFD700", pts: 1500,  p: "10% off + priority entry" },
  { n: "Platinum", c: "#E5E4E2", pts: 4000,  p: "15% off + VIP queues" },
  { n: "Diamond",  c: "#B9F2FF", pts: 10000, p: "20% off + free +1 monthly" },
];

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => {
    if (isAuthenticated()) router.replace("/events");
  }, [router]);

  return (
    <div className="flex flex-col" style={{ background: DARK }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative h-screen flex items-end overflow-hidden" style={{ background: DARK }}>
        <img
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&auto=format&fit=crop&q=90"
          alt="Crowd" className="absolute inset-0 w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,14,14,0.95) 0%, rgba(14,14,14,0.3) 55%, rgba(14,14,14,0.05) 100%)" }} />
        {/* Bottom bleed into next section */}
        <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${DARK}, ${DARK_RGBA_NONE})` }} />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-8 pb-24">
          <Reveal>
            <h1 className="text-7xl md:text-[8rem] font-black leading-[0.87] text-white mb-6 tracking-tight">
              One pass.<br /><span style={{ color: "var(--primary)" }}>Every party.</span>
            </h1>
            <p className="text-xl text-white/60 max-w-lg mb-10 leading-relaxed">
              Buy tickets, scan in, earn rewards — across every venue in Nairobi. One app, every night.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Link href="/events" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-black px-8 py-4 rounded-full transition-colors text-base">Browse Parties →</Link>
              <Link href="/register" className="px-8 py-4 rounded-full border border-white/25 text-white text-sm font-bold hover:border-white/50 transition-colors">Create free account</Link>
              <div className="flex gap-6 ml-2">
                {[["200+","Events/mo"],["15k+","Members"],["98%","Scan rate"]].map(([v,l]) => (
                  <div key={l} className="text-xs text-white/40">
                    <span className="block text-white font-black text-lg leading-tight">{v}</span>{l}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 1. DISCOVER ─────────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1400&auto=format&fit=crop&q=90"
        side="right" label="Discover"
        heading={<>Find your<br />next night out</>}
        body="Browse club nights, festivals, boat parties, rooftop sessions and more. Filter by date, city, vibe, or price. Nairobi never sleeps."
        bullets={["200+ events monthly across Nairobi and Mombasa","Filter by vibe — Club Night, Festival, Family, Online","Sold-out status, live capacity, and pricing at a glance"]}
        cta={{ href: "/events", label: "See what's on" }} />

      {/* ── 2. BOOK TICKETS ─────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1400&auto=format&fit=crop&q=90"
        side="left" label="My Tickets"
        heading={<>Tickets in your<br />pocket. Instantly.</>}
        body="Pay with M-Pesa and your QR ticket lands in your wallet the moment it clears — no printing, no email hunting, just scan and walk in."
        bullets={["M-Pesa STK push — confirm on your phone in seconds","Ticket tiers: GA, VIP, Early Bird, Table, Backstage","QR lives in-app — accessible offline anytime","View, share, or transfer any ticket from your wallet"]} />

      {/* ── 3. LOYALTY ──────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: DARK }}>
        <img src="https://images.unsplash.com/photo-1571266028243-e3e07b18d0ab?w=1600&auto=format&fit=crop&q=90"
          alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,14,14,0.7) 0%, rgba(14,14,14,0.3) 50%, rgba(14,14,14,0.7) 100%)" }} />
        <div className="absolute top-0 inset-x-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${DARK}, ${DARK_RGBA_NONE})` }} />
        <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to top, ${DARK}, ${DARK_RGBA_NONE})` }} />
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-28 w-full">
          <div className="flex flex-col md:flex-row gap-14 items-center">
            <Reveal className="flex-1">
              <p className="text-[var(--primary)] text-xs font-black uppercase tracking-[0.2em] mb-5">Loyalty</p>
              <h2 className="text-5xl md:text-[3.2rem] font-black text-white leading-[1.05] mb-6">
                Every ticket<br />earns you more<br /><span style={{ color: "var(--primary)" }}>next time.</span>
              </h2>
              <p className="text-base md:text-lg text-white/65 leading-relaxed">
                Five tiers, endless perks. Earn points on every ticket. Redeem for free tickets, discounts, and VIP access.
              </p>
            </Reveal>
            <Reveal delay={200} className="flex-1 max-w-sm w-full">
              <div className="space-y-2.5">
                {TIERS.map((t) => (
                  <div key={t.n} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: t.c, color: "#000" }}>{t.n[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm">{t.n}</p>
                      <p className="text-xs text-white/40 truncate">{t.p}</p>
                    </div>
                    <p className="text-xs text-white/30 font-mono shrink-0">{t.pts > 0 ? `${t.pts}+` : "Free"}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 4. WAITLIST ─────────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1400&auto=format&fit=crop&q=90"
        side="right" label="Smart Waitlist"
        heading={<>Sold out?<br />Not done yet.</>}
        body="Join the waitlist for any sold-out event. The moment a ticket drops you're notified instantly — claim it before anyone else."
        bullets={["One tap to join the waitlist for any full event","Instant push notification when a spot opens","First-in-first-out — fair, transparent, no bots","Claim directly from the notification"]} />

      {/* ── 5. WRISTBAND ────────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1400&auto=format&fit=crop&q=90"
        side="left" label="Wristband Wallet"
        heading={<>Go cashless.<br /><span style={{ color: "var(--primary)" }}>Tap to pay.</span></>}
        body="Load KES onto your NFC wristband at entry. Tap to buy drinks, food, and merch at any stall inside. No wallet, no phone, no fuss."
        bullets={["Load any amount from your PartyPass wallet at the door","Tap at every bar, food stall, and merch stand inside","Remaining balance refunded to wallet after the event","Full transaction history visible in-app"]} />

      {/* ── 6. GROUP BOOKING ────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1400&auto=format&fit=crop&q=90"
        side="right" label="Group Booking"
        heading={<>Book for the<br />whole squad.</>}
        body="One organiser, one transaction, multiple tickets. Share a link and everyone gets their own QR — no splitting payments, no chasing anyone."
        bullets={["Buy multiple tickets across any tier in one checkout","Shared link — each person gets their own QR on their phone","Organiser sees who accepted and who is pending","Works for friend groups, birthdays, and corporates"]} />

      {/* ── 7. VENUES ───────────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1400&auto=format&fit=crop&q=90"
        side="left" label="Venues"
        heading={<>Every venue.<br />One place.</>}
        body="Browse all participating clubs, rooftops, arenas, and pop-up spaces. See upcoming events, capacity, location, and real reviews before you book."
        bullets={["Full venue profiles — photos, capacity, location","Browse all upcoming events at each venue in one scroll","Verified reviews from real attendees only","Filter by city, type, or upcoming date"]}
        cta={{ href: "/venues", label: "Explore venues" }} />

      {/* ── 8. MEMBERSHIP ───────────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1400&auto=format&fit=crop&q=90"
        side="right" label="Membership"
        heading={<>Built for<br /><span style={{ color: "var(--primary)" }}>night owls.</span></>}
        body="Upgrade your membership and unlock permanent discounts, priority access, and exclusive perks across every event you attend."
        bullets={["Monthly or annual billing — cancel anytime","Permanent tier discount on all ticket purchases","Skip the line — priority lane at every gate","Members-only events and early-access drops"]}
        cta={{ href: "/membership", label: "See plans" }} />

      {/* ── 9. ORGANIZER: CREATE ────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&auto=format&fit=crop&q=90"
        side="left" label="For Organisers — Events"
        heading={<>Create and sell<br />in minutes.</>}
        body="Set up your event, build ticket tiers with custom pricing, set capacity, pick a date, add your venue — and start selling immediately."
        bullets={["Create events in under 5 minutes from the organiser portal","Custom ticket tiers — GA, VIP, Table, Early Bird, Backstage","Per-tier capacity limits and optional closing dates","Publish immediately or schedule a future release"]}
        cta={{ href: "/register", label: "Start selling tickets" }} />

      {/* ── 10. ORGANIZER: GATES ────────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&auto=format&fit=crop&q=90"
        side="right" label="For Organisers — Gates & Team"
        heading={<>Zero queues.<br /><span style={{ color: "var(--primary)" }}>Zero fakes.</span></>}
        body="Add gate staff, assign them to specific gates, and watch headcounts update live from your organiser dashboard in real time."
        stats={[
          { v: "< 1 sec",  l: "Average QR scan — cryptographically validated" },
          { v: "Live",     l: "Real-time headcount visible to you as organiser" },
          { v: "Offline",  l: "Scanner works without signal at the venue" },
          { v: "Roles",    l: "Scanner, Supervisor, or Cashier per staff member" },
        ]} />

      {/* ── 11. ORGANIZER: EARNINGS ─────────────────────────────────────── */}
      <FS img="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1400&auto=format&fit=crop&q=90"
        side="left" label="For Organisers — Earnings"
        heading={<>Your money.<br />Same day.</>}
        body="Track every ticket sale live. Request a payout to M-Pesa after your event ends — funds clear the same day, no bank account required."
        stats={[
          { v: "Real-time", l: "Revenue dashboard — gross, net, per-tier, live" },
          { v: "Same day",  l: "Payouts to M-Pesa processed after event ends" },
          { v: "M-Pesa",   l: "Direct to your phone — no bank needed" },
          { v: "Full log",  l: "Every transaction, fee, and refund in history" },
        ]}
        cta={{ href: "/register", label: "Open organiser portal" }} />

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[72vh] flex items-center justify-center overflow-hidden" style={{ background: DARK }}>
        <img src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&auto=format&fit=crop&q=90"
          alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,14,14,0.7) 0%, rgba(14,14,14,0.4) 50%, rgba(14,14,14,0.7) 100%)" }} />
        <div className="absolute top-0 inset-x-0 h-24 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${DARK}, ${DARK_RGBA_NONE})` }} />
        <div className="relative z-10 max-w-3xl mx-auto px-8 text-center">
          <Reveal>
            <h2 className="text-6xl md:text-[5.5rem] font-black text-white mb-6 leading-[0.95] tracking-tight">
              Ready to<br />party?
            </h2>
            <p className="text-xl text-white/50 mb-12">Join 15,000+ members who never miss a night out.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register" className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-black px-10 py-5 rounded-full transition-colors text-lg">Get started — it&apos;s free</Link>
              <Link href="/events" className="border border-white/25 hover:border-white/50 text-white font-bold px-10 py-5 rounded-full transition-colors text-lg">Browse parties</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                  <span className="text-white text-xs font-black">PP</span>
                </div>
                <span className="font-black text-xl text-[var(--text)]">PartyPass</span>
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">The nightlife OS for Nairobi and beyond. Tickets, loyalty, wristbands, gates — one place.</p>
            </div>
            {[
              { title: "Platform",   links: [{ l: "Browse Events", h: "/events" }, { l: "Venues", h: "/venues" }, { l: "Club Nights", h: "/clubs" }, { l: "Membership", h: "/membership" }] },
              { title: "Organisers", links: [{ l: "Create an Event", h: "/register" }, { l: "Organiser Portal", h: "/organizer" }, { l: "Gate Management", h: "/organizer" }, { l: "Payouts", h: "/organizer/wallet" }] },
              { title: "Account",    links: [{ l: "Sign Up", h: "/register" }, { l: "Log In", h: "/login" }, { l: "My Tickets", h: "/tickets" }, { l: "Loyalty", h: "/loyalty" }] },
              { title: "Support",    links: [{ l: "Help Centre", h: "/help" }, { l: "Contact Us", h: "/help" }, { l: "Privacy Policy", h: "/privacy" }, { l: "Terms of Service", h: "/terms" }] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-4">{title}</p>
                <ul className="space-y-3">
                  {links.map(({ l, h }) => (
                    <li key={l}><Link href={h} className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-xs text-[var(--muted)]">© {new Date().getFullYear()} PartyPass Ltd. All rights reserved.</p>
            <p className="text-xs text-[var(--muted)]">Made in Nairobi 🇰🇪</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
