"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUser, removeToken } from "@/lib/auth";
import { userApi, notificationsApi, unwrap } from "@/lib/api";
import { toggleTheme, isDark } from "@/lib/theme";
import type { User } from "@/types";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#CD7F32", SILVER: "#C0C0C0", GOLD: "#FFD700",
  PLATINUM: "#E5E4E2", DIAMOND: "#B9F2FF",
};

type NavItem = { href: string; icon: string; label: string };

const DISCOVER: NavItem[] = [
  { href: "/events",  icon: "🎉", label: "Events" },
  { href: "/venues",  icon: "🏟️", label: "Venues & Clubs" },
];

const MY_TICKETS: NavItem[] = [
  { href: "/tickets",  icon: "🎟️", label: "My Tickets" },       // QR entry passes
  { href: "/orders",   icon: "🧾", label: "Purchase History" }, // payment receipts
  { href: "/waitlist", icon: "⏳", label: "Waitlist" },
];

const MY_ACCOUNT: NavItem[] = [
  { href: "/wallet",      icon: "💳", label: "Wallet" },
  { href: "/loyalty",     icon: "💎", label: "Loyalty & Rewards" },
  { href: "/membership",  icon: "👑", label: "Membership" },
  { href: "/notifications", icon: "🔔", label: "Notifications" },
];

const ORGANIZER_ITEMS: NavItem[] = [
  { href: "/organizer",            icon: "📅", label: "My Events" },
  { href: "/organizer/events/new", icon: "➕", label: "Create Event" },
  { href: "/organizer/wallet",     icon: "💰", label: "Revenue & Payouts" },
  { href: "/organizer/team",       icon: "👥", label: "My Team" },
  { href: "/organizer/venues",     icon: "🏛️", label: "Clubs & Venues" },
];

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-1">
      {title && (
        <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{title}</p>
      )}
      {items.map((item) => {
        const active = pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
              active
                ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                : "text-[var(--text)] hover:bg-[var(--surface)]"
            }`}>
            <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
            <span className="truncate flex-1">{item.label}</span>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />}
          </Link>
        );
      })}
    </div>
  );
}

export default function AppSidebar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setDark(isDark());
    setUser(getUser<User>());
    userApi.me().then((r) => setUser(unwrap<User>(r))).catch(() => {});
    // Fetch unread notification count
    notificationsApi.list({ limit: 50 }).then((r) => {
      const items = unwrap<{ items?: { isRead: boolean }[]; } | { isRead: boolean }[]>(r);
      const list = Array.isArray(items) ? items : (items as { items?: { isRead: boolean }[] }).items ?? [];
      setUnread(list.filter((n) => !n.isRead).length);
    }).catch(() => {});
  }, []);

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ORGANIZER";

  function logout() { removeToken(); router.push("/login"); }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/events?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-[var(--card-bg)] border-r border-[var(--border)] z-40 overflow-y-auto scrollbar-none">

      {/* Top bar: logo + icons */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)] shrink-0">
        <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-black">PP</span>
          </div>
          <span className="font-black text-base text-[var(--text)] truncate">PartyPass</span>
        </Link>

        {/* Notifications bell */}
        <Link href="/notifications" className="relative p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--primary)] text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        {/* Dark / light toggle */}
        <button onClick={() => setDark(toggleTheme() === "dark")}
          className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors shrink-0 text-[var(--text)]"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 bg-[var(--surface)] rounded-xl px-3 py-2 border border-[var(--border)] focus-within:border-[var(--primary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)] shrink-0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none flex-1 min-w-0"
          />
        </div>
      </form>

      {/* User card */}
      {user && (
        <Link href="/profile"
          className="flex items-center gap-3 mx-3 mb-2 px-3 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] transition-colors shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
              : `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate leading-tight">{user.firstName} {user.lastName}</p>
            {user.loyaltyTier ? (
              <p className="text-[11px] font-semibold truncate leading-tight"
                style={{ color: TIER_COLORS[user.loyaltyTier] ?? "var(--muted)" }}>
                ★ {user.loyaltyTier} · {(user.loyaltyPoints ?? 0).toLocaleString()} pts
              </p>
            ) : (
              <p className="text-[11px] text-[var(--muted)] truncate leading-tight">{user.role?.replace(/_/g, " ")}</p>
            )}
          </div>
        </Link>
      )}

      {/* Nav sections */}
      <nav className="flex-1 px-3 pb-4 space-y-4 overflow-y-auto scrollbar-none">
        <NavSection title="Discover" items={DISCOVER} />
        <NavSection title="My Tickets" items={MY_TICKETS} />
        <NavSection title="My Account" items={MY_ACCOUNT} />
        {isOrganizer && <NavSection title="Organizer" items={ORGANIZER_ITEMS} />}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-[var(--border)] pt-3 shrink-0">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
          <span className="text-base w-5 text-center">🚪</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
