"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, unwrap } from "@/lib/api";
import { setToken, setRefreshToken, setUser } from "@/lib/auth";
import type { User } from "@/types";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = authApi.login(email, password);
      const data = unwrap<{ user: User; accessToken: string; refreshToken: string }>(await res);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      toast.success("Welcome back!");
      const isOrganizer = data.user?.role === "ORGANIZER" || data.user?.role === "CLUB_OWNER";
      router.push(isOrganizer ? "/organizer" : "/events");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-black mb-1">Welcome back 👋</h1>
        <p className="text-[var(--muted)] text-sm mb-6">Log in to your PartyPass account</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input className="input-base" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <input className="input-base pr-10" type={show ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">{show ? "Hide" : "Show"}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--primary)] font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
