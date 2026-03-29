"use client";
import { useEffect, useState } from "react";
import { notificationsApi, unwrap } from "@/lib/api";
import type { Notification, PaginatedResponse } from "@/types";
import { fmtRelative } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: string; bg: string; accent: string }> = {
  TICKET_CONFIRMED:  { icon: "🎟️", bg: "bg-green-50",   accent: "border-l-green-500" },
  EVENT_REMINDER:    { icon: "⏰", bg: "bg-orange-50",  accent: "border-l-orange-400" },
  PAYMENT_SUCCESS:   { icon: "✅", bg: "bg-green-50",   accent: "border-l-green-500" },
  PAYMENT_FAILED:    { icon: "❌", bg: "bg-red-50",     accent: "border-l-red-500" },
  TICKET_TRANSFERRED:{ icon: "📤", bg: "bg-blue-50",    accent: "border-l-blue-500" },
  LOYALTY_POINTS:    { icon: "⭐", bg: "bg-yellow-50",  accent: "border-l-yellow-400" },
  PROMO:             { icon: "🎁", bg: "bg-purple-50",  accent: "border-l-purple-400" },
  EVENT_UPDATE:      { icon: "📅", bg: "bg-blue-50",    accent: "border-l-blue-400" },
  SYSTEM:            { icon: "📢", bg: "bg-[var(--surface)]", accent: "border-l-[var(--muted)]" },
};

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const yestStr = yesterday.toDateString();
  const groups: Record<string, Notification[]> = {};

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    let label: string;
    if (d.toDateString() === todayStr) label = "Today";
    else if (d.toDateString() === yestStr) label = "Yesterday";
    else label = d.toLocaleDateString("en-KE", { weekday: "long", month: "short", day: "numeric" });
    groups[label] = [...(groups[label] ?? []), n];
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    notificationsApi.list({ limit: 50 })
      .then((r) => {
        const d = unwrap<PaginatedResponse<Notification>>(r);
        setNotifications(d.items ?? (d as unknown as Notification[]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id: string) {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  async function markAllRead() {
    setMarkingAll(true);
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  if (loading) return (
    <div className="space-y-3">
      <div className="h-9 w-48 bg-[var(--surface)] rounded-xl animate-pulse mb-6" />
      {[1,2,3,4,5].map((i) => (
        <div key={i} className="card h-20 animate-pulse bg-[var(--surface)]"
          style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );

  const groups = groupByDate(notifications);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-[var(--text)]">Notifications</h1>
          {unread > 0 ? (
            <p className="text-sm mt-0.5">
              <span className="inline-flex items-center gap-1.5 bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-xs px-2.5 py-1 rounded-full">
                {unread} unread
              </span>
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)] mt-0.5">You're all caught up</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="text-sm border border-[var(--border)] px-3 py-1.5 rounded-full font-semibold text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-40 mt-1">
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-[var(--surface)] flex items-center justify-center text-4xl mx-auto mb-4">🔕</div>
          <p className="font-bold text-xl text-[var(--text)] mb-2">All clear!</p>
          <p className="text-[var(--muted)] text-sm">No notifications yet. When something happens, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3 px-1">{label}</p>
              <div className="space-y-2">
                {items.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
                  return (
                    <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                      className={`rounded-2xl border border-[var(--border)] overflow-hidden transition-all cursor-pointer hover:shadow-sm ${!n.isRead ? `border-l-4 ${cfg.accent}` : "opacity-70"}`}>
                      <div className={`p-4 flex gap-3 ${!n.isRead ? cfg.bg : ""}`}>
                        <div className="w-10 h-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-xl flex-shrink-0">
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${!n.isRead ? "font-bold text-[var(--text)]" : "text-[var(--text)]"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-[var(--muted)] mt-1.5 font-medium">{fmtRelative(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] flex-shrink-0 mt-1.5 shadow-sm" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
