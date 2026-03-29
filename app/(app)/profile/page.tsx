"use client";
import { useEffect, useState, useRef } from "react";
import { userApi, unwrap } from "@/lib/api";
import type { User } from "@/types";
import { removeToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#CD7F32", SILVER: "#C0C0C0", GOLD: "#FFD700",
  PLATINUM: "#E5E4E2", DIAMOND: "#B9F2FF",
};
const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
const TIER_NEXT: Record<string, string> = {
  BRONZE: "SILVER", SILVER: "GOLD", GOLD: "PLATINUM", PLATINUM: "DIAMOND",
};
const TIER_PTS_REQ: Record<string, number> = {
  BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, DIAMOND: 15000,
};

function tierProgress(tier: string, pts: number) {
  const current = TIER_PTS_REQ[tier] ?? 0;
  const next = TIER_PTS_REQ[TIER_NEXT[tier] ?? ""] ?? current;
  if (!TIER_NEXT[tier]) return 100;
  return Math.min(100, Math.round(((pts - current) / (next - current)) * 100));
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const r = await userApi.uploadAvatar(file);
      setUser(unwrap<User>(r));
      toast.success("Photo updated!");
    } catch { toast.error("Upload failed"); }
    finally { setAvatarUploading(false); e.target.value = ""; }
  }

  useEffect(() => {
    userApi.me()
      .then((r) => {
        const u = unwrap<User>(r);
        setUser(u);
        setForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? "" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await userApi.update({ firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined });
      setUser(unwrap<User>(r));
      setEditing(false);
      toast.success("Profile updated!");
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  }

  function logout() { removeToken(); router.push("/login"); }

  if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading…</div>;

  const tier = user?.loyaltyTier ?? "BRONZE";
  const pts = user?.loyaltyPoints ?? 0;
  const progress = tierProgress(tier, pts);
  const nextTier = TIER_NEXT[tier];
  const tierColor = TIER_COLORS[tier] ?? "var(--primary)";

  return (
    <div className="max-w-xl mx-auto space-y-4">

      {/* Hero card */}
      <div className="card overflow-hidden">
        {/* Gradient banner */}
        <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${tierColor}44, ${tierColor}11)` }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        </div>

        <div className="px-5 pb-5">
          {/* Avatar — overlaps banner */}
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-[var(--card-bg)] overflow-hidden bg-[var(--primary)] text-white text-2xl font-black flex items-center justify-center shrink-0">
                {user?.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
                }
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--primary)] border-2 border-[var(--card-bg)] flex items-center justify-center shadow hover:opacity-90 transition-opacity"
              >
                {avatarUploading
                  ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                }
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${user?.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {user?.isVerified ? "✓ Verified" : "⚠ Unverified"}
              </span>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="text-xs border border-[var(--border)] px-3 py-1 rounded-full font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  Edit
                </button>
              )}
            </div>
          </div>

          <h1 className="text-xl font-black text-[var(--text)]">{user?.firstName} {user?.lastName}</h1>
          <p className="text-sm text-[var(--muted)]">{user?.email}</p>
          {user?.phone && <p className="text-sm text-[var(--muted)]">{user.phone}</p>}
          <p className="text-xs text-[var(--muted)] mt-0.5 capitalize">{user?.role?.replace(/_/g, " ").toLowerCase()}</p>

          {/* Loyalty tier */}
          {tier && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wide" style={{ color: tierColor }}>★ {tier}</span>
                  <span className="text-xs text-[var(--muted)]">· {pts.toLocaleString()} pts</span>
                </div>
                {nextTier && (
                  <span className="text-xs text-[var(--muted)]">
                    {(TIER_PTS_REQ[nextTier] - pts).toLocaleString()} pts to {nextTier}
                  </span>
                )}
              </div>
              <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: tierColor }} />
              </div>
              {/* Tier dots */}
              <div className="flex justify-between mt-1.5">
                {TIER_ORDER.map((t) => (
                  <span key={t} className="text-[9px] font-bold uppercase"
                    style={{ color: t === tier ? tierColor : "var(--muted)", opacity: TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(tier) ? 0.4 : 1 }}>
                    {t.slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card p-5">
          <h3 className="font-bold mb-4">Edit Profile</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] font-medium block mb-1">First Name</label>
                <input className="input-base" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-medium block mb-1">Last Name</label>
                <input className="input-base" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] font-medium block mb-1">Phone</label>
              <input className="input-base" type="tel" placeholder="e.g. 0712345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Save Changes"}</button>
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text)]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="card divide-y divide-[var(--border)]">
        {[
          { icon: "🎟️", label: "My Tickets",      sub: "View and manage tickets",   href: "/tickets" },
          { icon: "📦", label: "Order History",    sub: "Past purchases",             href: "/orders" },
          { icon: "💳", label: "My Wallet",        sub: "Balance and transactions",   href: "/wallet" },
          { icon: "💎", label: "Loyalty Wallet",   sub: `${pts.toLocaleString()} pts · ${tier}`, href: "/loyalty" },
          { icon: "👑", label: "Membership",       sub: "Plans and benefits",         href: "/membership" },
          { icon: "🔔", label: "Notifications",    sub: "Alerts and updates",         href: "/notifications" },
        ].map(({ icon, label, sub, href }) => (
          <button key={href} onClick={() => router.push(href)}
            className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-[var(--surface)] transition-colors">
            <span className="text-xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text)]">{label}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{sub}</p>
            </div>
            <span className="text-[var(--muted)] text-lg">›</span>
          </button>
        ))}
      </div>

      {/* Organizer info */}
      {user?.organizerName && (
        <div className="card p-5">
          <p className="text-xs text-[var(--muted)] font-black uppercase tracking-widest mb-3">Organizer Account</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Business Name</span>
              <span className="font-semibold text-[var(--text)]">{user.organizerName}</span>
            </div>
            {user.payoutMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Payout Method</span>
                <span className="font-semibold text-[var(--text)]">{user.payoutMethod.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>
          <button onClick={() => router.push("/organizer")} className="btn-primary w-full mt-4 !text-sm !py-2.5">
            Go to Organizer Dashboard
          </button>
        </div>
      )}

      <button onClick={logout}
        className="w-full py-3.5 rounded-xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
        Sign Out
      </button>
    </div>
  );
}
