"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

// Attendee tabs — always visible regardless of role
const BASE_TABS = [
  { href: "/events",     icon: "🎉", label: "Parties" },
  { href: "/tickets",    icon: "🎟️", label: "Tickets" },
  { href: "/loyalty",    icon: "💎", label: "Loyalty" },
  { href: "/membership", icon: "👑", label: "Members" },
  { href: "/profile",    icon: "👤", label: "Me" },
];

// Organizer tabs — replaces middle 3 with organizer features
// but keeps Parties & Me so organizer can still attend events
const ORGANIZER_TABS = [
  { href: "/events",           icon: "🎉", label: "Parties" },
  { href: "/tickets",          icon: "🎟️", label: "Tickets" },
  { href: "/organizer",        icon: "📅", label: "My Events" },
  { href: "/organizer/wallet", icon: "💰", label: "Wallet" },
  { href: "/profile",          icon: "👤", label: "Me" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  // Start with null so server and client render the same initial HTML
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Only read localStorage after mount — avoids SSR/client mismatch
    setUser(getUser<User>());
  }, []);

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "CLUB_OWNER";
  const tabs = isOrganizer ? ORGANIZER_TABS : BASE_TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--nav)] border-t border-[var(--nav-border)] safe-area-bottom">
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/events" && pathname.startsWith(tab.href));
          return (
            <Link key={tab.href + tab.label} href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? "text-[var(--primary)]" : "text-[var(--muted)]"
              }`}>
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${active ? "text-[var(--primary)]" : ""}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
