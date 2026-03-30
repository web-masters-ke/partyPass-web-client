"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getUser, setUser as cacheUser, removeToken } from "@/lib/auth";
import { userApi, unwrap } from "@/lib/api";
import { toggleTheme, isDark } from "@/lib/theme";
import type { User } from "@/types";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => { setDark(isDark()); }, []);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    // Load from cache immediately, then refresh from API to get latest avatarUrl
    setUser(getUser<User>());
    userApi.me().then((res) => {
      const fresh = unwrap<User>(res);
      cacheUser(fresh);  // update localStorage
      setUser(fresh);    // update UI
    }).catch(() => {/* not logged in or offline */});
  }, []);

  function logout() {
    removeToken();
    router.push("/login");
  }

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ORGANIZER";

  const links = [
    { href: "/events", label: "Parties" },
    { href: "/venues", label: "Venues" },
    { href: "/clubs", label: "Club Nights" },
    ...(isOrganizer ? [{ href: "/organizer", label: "My Portal" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[var(--nav)] border-b border-[var(--nav-border)] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white text-xs font-black">PP</span>
          </div>
          <span className="font-black text-lg text-[var(--text)]">PartyPass</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(toggleTheme() === "dark")}
            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-[var(--text)]"
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-lg hover:bg-[var(--surface)]" onClick={() => setMobileOpen(!mobileOpen)}>
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current" />
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-[var(--surface)] rounded-full px-3 py-1.5 text-sm font-medium hover:bg-[var(--border)] transition-colors"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.firstName} width={24} height={24} className="w-full h-full object-cover" />
                  ) : (
                    user.firstName[0]
                  )}
                </div>
                {user.firstName}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[var(--card-bg)] rounded-2xl shadow-xl border border-[var(--border)] py-1 z-50">
                  <Link href="/tickets" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">🎟️ My Tickets</Link>
                  <Link href="/loyalty" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">⭐ Loyalty</Link>
                  <Link href="/membership" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">👑 Membership</Link>
                  <Link href="/orders" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">📦 Orders</Link>
                  <Link href="/notifications" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">🔔 Notifications</Link>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">👤 Profile</Link>
                  {isOrganizer && (
                    <>
                      <div className="border-t border-[var(--border)] my-1" />
                      <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Organizer</p>
                      <Link href="/organizer" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">📅 My Events</Link>
                      <Link href="/organizer/wallet" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface)] transition-colors">💰 My Wallet</Link>
                    </>
                  )}
                  <div className="border-t border-[var(--border)] my-1" />
                  <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]">Log in</Link>
              <Link href="/register" className="btn-primary !py-2 !px-5 !text-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--nav)] px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${pathname.startsWith(l.href) ? "text-[var(--primary)] bg-[var(--surface)]" : "text-[var(--muted)]"}`}>
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <div className="border-t border-[var(--border)] my-2" />
              {["/tickets", "/loyalty", "/membership", "/orders", "/notifications", "/profile"].map((href) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)]">
                  {href.slice(1).charAt(0).toUpperCase() + href.slice(2)}
                </Link>
              ))}
              {isOrganizer && (
                <>
                  <div className="border-t border-[var(--border)] my-2" />
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Organizer</p>
                  <Link href="/organizer" onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)]">My Events</Link>
                  <Link href="/organizer/wallet" onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)]">My Wallet</Link>
                </>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
