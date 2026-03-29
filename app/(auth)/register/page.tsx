"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, userApi, unwrap } from "@/lib/api";
import { setToken, setRefreshToken, setUser } from "@/lib/auth";
import toast from "react-hot-toast";

type PayoutMethod = "PLATFORM_WALLET" | "OWN_PAYBILL" | "OWN_TILL";

const PAYOUT_OPTIONS: { v: PayoutMethod; label: string; sub: string; icon: string }[] = [
  { v: "PLATFORM_WALLET", label: "Use PartyPass Wallet", sub: "We collect on your behalf and settle to your M-Pesa.", icon: "💼" },
  { v: "OWN_PAYBILL",     label: "My Own Paybill",       sub: "Payments go directly to your M-Pesa Paybill.",       icon: "🧾" },
  { v: "OWN_TILL",        label: "My Own Till Number",   sub: "Payments go directly to your M-Pesa Till.",          icon: "🏪" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "",
    organizerName: "", payoutMethod: "PLATFORM_WALLET" as PayoutMethod,
    paybillNumber: "", mpesaAccountRef: "", tillNumber: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password,
        role: isOrganizer ? "ORGANIZER" : "ATTENDEE",
      };
      if (form.phone) body.phone = form.phone;
      if (isOrganizer) {
        body.organizerName = form.organizerName;
        body.payoutMethod = form.payoutMethod;
        if (form.payoutMethod === "OWN_PAYBILL") {
          body.paybillNumber = form.paybillNumber;
          body.mpesaAccountRef = form.mpesaAccountRef;
        }
        if (form.payoutMethod === "OWN_TILL") body.tillNumber = form.tillNumber;
      }
      const res = await authApi.register(body);
      const data = unwrap<{ user: unknown; accessToken: string; refreshToken: string }>(res);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);

      if (avatarFile) {
        try { await userApi.uploadAvatar(avatarFile); } catch { /* non-fatal */ }
      }

      toast.success("Account created!");
      router.push("/events");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Registration failed";
      toast.error(msg);
    } finally { setLoading(false); }
  }

  const initials = [form.firstName[0], form.lastName[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div className="w-full max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-black mb-1">Join the party 🎉</h1>
        <p className="text-[var(--muted)] text-sm mb-6">Create your account to get started</p>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] transition-colors flex items-center justify-center bg-[var(--surface)]">
            {avatarPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              : <span className="text-3xl font-black text-[var(--muted)]">{initials}</span>
            }
            <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center shadow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </span>
          </button>
          <p className="text-xs text-[var(--muted)] mt-2">{avatarFile ? avatarFile.name : "Add photo (optional)"}</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
        </div>

        {/* Account type toggle */}
        <div className="flex bg-[var(--surface)] rounded-xl p-1 mb-6">
          {(["Attendee", "Organizer"] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => setIsOrganizer(t === "Organizer")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                (t === "Organizer") === isOrganizer ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)]"
              }`}>
              <span>{t === "Attendee" ? "👤" : "🎪"}</span> {t}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--muted)] block mb-1">First name</label>
              <input className="input-base" placeholder="Jane" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)] block mb-1">Last name</label>
              <input className="input-base" placeholder="Doe" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1">Email address</label>
            <input className="input-base" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1">
              Phone <span className="font-normal">(optional)</span>
            </label>
            <input className="input-base" type="tel" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1">Password</label>
            <div className="relative">
              <input className="input-base pr-14" type={showPass ? "text" : "password"} placeholder="Min 8 characters"
                value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1">Confirm password</label>
            <div className="relative">
              <input className="input-base pr-14" type={showConfirm ? "text" : "password"} placeholder="••••••••"
                value={form.confirm} onChange={(e) => set("confirm", e.target.value)} required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Organizer details — expand inline when organizer is selected */}
          {isOrganizer && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Organizer Details</p>

              <div>
                <label className="text-xs font-medium text-[var(--muted)] block mb-1">Business / Organization name</label>
                <input className="input-base" placeholder="e.g. Eventify Kenya" value={form.organizerName}
                  onChange={(e) => set("organizerName", e.target.value)} required={isOrganizer} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-3">How do you want to receive payments?</p>
                <div className="space-y-2">
                  {PAYOUT_OPTIONS.map((o) => (
                    <button key={o.v} type="button" onClick={() => set("payoutMethod", o.v)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        form.payoutMethod === o.v
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40"
                      }`}>
                      <span className="w-9 h-9 rounded-lg bg-[var(--border)]/50 flex items-center justify-center text-lg shrink-0">{o.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${form.payoutMethod === o.v ? "text-[var(--primary)]" : ""}`}>{o.label}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{o.sub}</p>
                      </div>
                      {/* Radio dot */}
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        form.payoutMethod === o.v ? "border-[var(--primary)]" : "border-[var(--muted)]"
                      }`}>
                        {form.payoutMethod === o.v && <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {form.payoutMethod === "OWN_PAYBILL" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">Paybill number</label>
                    <input className="input-base" placeholder="e.g. 174379" type="number" value={form.paybillNumber}
                      onChange={(e) => set("paybillNumber", e.target.value)} required={form.payoutMethod === "OWN_PAYBILL"} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] block mb-1">Account reference</label>
                    <input className="input-base" placeholder="e.g. EVENTSCO" value={form.mpesaAccountRef}
                      onChange={(e) => set("mpesaAccountRef", e.target.value)} required={form.payoutMethod === "OWN_PAYBILL"} />
                  </div>
                </div>
              )}

              {form.payoutMethod === "OWN_TILL" && (
                <div>
                  <label className="text-xs font-medium text-[var(--muted)] block mb-1">Till number</label>
                  <input className="input-base" placeholder="e.g. 5678901" type="number" value={form.tillNumber}
                    onChange={(e) => set("tillNumber", e.target.value)} required={form.payoutMethod === "OWN_TILL"} />
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
