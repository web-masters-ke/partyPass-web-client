"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUser, removeToken } from "@/lib/auth";

import { toggleTheme, isDark } from "@/lib/theme";
import type { User } from "@/types";

const ALL_LINKS = [
  { section: "Discover",  href: "/events",              icon: "🎉", label: "Parties" },
  { section: "Discover",  href: "/venues",              icon: "🏟️", label: "Venues" },
  { section: "Discover",  href: "/clubs",               icon: "🎵", label: "Club Nights" },
  { section: "My Account",href: "/tickets",             icon: "🎟️", label: "My Tickets" },
  { section: "My Account",href: "/orders",              icon: "📦", label: "Orders" },
  { section: "My Account",href: "/wallet",              icon: "💳", label: "Wallet" },
  { section: "My Account",href: "/loyalty",             icon: "💎", label: "Loyalty" },
  { section: "My Account",href: "/membership",          icon: "👑", label: "Membership" },
  { section: "My Account",href: "/notifications",       icon: "🔔", label: "Notifications" },
  { section: "Organizer", href: "/organizer",           icon: "📅", label: "My Events",       organizer: true },
  { section: "Organizer", href: "/organizer/wallet",    icon: "💰", label: "Revenue & Payouts",organizer: true },
  { section: "Organizer", href: "/organizer/team",      icon: "👥", label: "My Team",          organizer: true },
];

export default function MobileTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(isDark());
    setUser(getUser<User>());
  }, []);

  // close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ORGANIZER";
  const visible = ALL_LINKS.filter((l) => !l.organizer || isOrganizer);
  const sections = [...new Set(visible.map((l) => l.section))];

  function logout() { removeToken(); router.push("/login"); }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-[var(--nav)] border-b border-[var(--nav-border)] flex items-center justify-between px-4 h-14">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
          <span className="text-white text-[10px] font-black">PP</span>
        </div>
        <span className="font-black text-base">PartyPass</span>
      </Link>

      <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-[var(--surface)]">
        <div className="w-5 space-y-1">
          <div className="h-0.5 bg-current rounded" />
          <div className="h-0.5 bg-current rounded" />
          <div className="h-0.5 bg-current rounded" />
        </div>
      </button>

      {/* Drawer overlay */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-72 bg-[var(--card-bg)] z-50 flex flex-col shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
              <span className="font-black text-lg">Menu</span>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-[var(--surface)] text-xl leading-none">✕</button>
            </div>

            {/* User */}
            {user && (
              <Link href="/profile" className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
                onClick={() => setOpen(false)}>
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                </div>
              </Link>
            )}

            {/* Nav sections */}
            <nav className="flex-1 px-3 py-4 space-y-5">
              {sections.map((section) => (
                <div key={section}>
                  <p className="px-2 mb-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{section}</p>
                  {visible.filter((l) => l.section === section).map((item) => {
                    const active = pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                          active ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold" : "text-[var(--text)] hover:bg-[var(--surface)]"
                        }`}>
                        <span className="w-5 text-center">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Bottom */}
            <div className="px-3 pb-6 border-t border-[var(--border)] pt-3 space-y-1">
              <button onClick={() => { setDark(toggleTheme() === "dark"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
                <span className="w-5 text-center">{dark ? "☀️" : "🌙"}</span>
                <span>{dark ? "Light mode" : "Dark mode"}</span>
              </button>
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                <span className="w-5 text-center">🚪</span>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
