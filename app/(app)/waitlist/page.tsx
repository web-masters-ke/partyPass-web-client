"use client";
import { useEffect, useState } from "react";
import { waitlistApi, unwrap } from "@/lib/api";
import { useRouter } from "next/navigation";

type WaitlistEntry = {
  id: string;
  status: string;
  position?: number;
  claimExpiresAt?: string;
  event?: { id: string; title: string; coverImageUrl?: string; startDateTime: string };
  tier?: { name: string };
  eventTitle?: string;
  tierName?: string;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  WAITING: { label: "Waiting", cls: "bg-yellow-100 text-yellow-700" },
  NOTIFIED: { label: "Claim Available!", cls: "bg-green-100 text-green-700" },
  AVAILABLE: { label: "Claim Available!", cls: "bg-green-100 text-green-700" },
  CLAIMED: { label: "Claimed", cls: "bg-blue-100 text-blue-600" },
  EXPIRED: { label: "Expired", cls: "bg-[var(--surface)] text-[var(--muted)]" },
};

function useCountdown(expiresAt?: string) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return null;
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function WaitlistCard({ entry, onClaim }: { entry: WaitlistEntry; onClaim: (id: string) => void }) {
  const [claiming, setClaiming] = useState(false);
  const countdown = useCountdown(entry.claimExpiresAt);
  const isAvailable = entry.status === "NOTIFIED" || entry.status === "AVAILABLE";
  const cfg = STATUS_CONFIG[entry.status] ?? { label: entry.status, cls: "bg-[var(--surface)] text-[var(--muted)]" };

  const doClam = async () => {
    setClaiming(true);
    try { await onClaim(entry.id); } finally { setClaiming(false); }
  };

  return (
    <div className={`bg-[var(--card-bg)] rounded-2xl p-5 border ${isAvailable ? "border-green-300 shadow-md shadow-green-100" : "border-[var(--border)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[var(--text)] truncate">
            {entry.event?.title ?? entry.eventTitle ?? "Event"}
          </p>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {entry.tier?.name ?? entry.tierName ?? "General Admission"}
            {entry.position && entry.status === "WAITING" && (
              <span className="ml-3">· Position #{entry.position}</span>
            )}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {isAvailable && (
        <div className="mt-4 space-y-3">
          {countdown && (
            <p className="text-sm text-orange-600 font-semibold flex items-center gap-1">
              ⏱ Expires in {countdown}
            </p>
          )}
          <button
            onClick={doClam}
            disabled={claiming}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-full transition disabled:opacity-60 text-sm"
          >
            {claiming ? "Claiming…" : "Claim Ticket"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimMsg, setClaimMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const load = () => {
    setLoading(true);
    waitlistApi.mine().then((r) => {
      const d = unwrap<WaitlistEntry[] | { items: WaitlistEntry[] }>(r);
      setEntries(Array.isArray(d) ? d : d.items ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleClaim = async (id: string) => {
    try {
      await waitlistApi.claim(id);
      setClaimMsg({ type: "success", text: "Ticket claimed! Check your tickets." });
      load();
      setTimeout(() => router.push("/tickets"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not claim ticket";
      setClaimMsg({ type: "error", text: msg });
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--text)]">My Waitlist</h1>
          <button onClick={load} className="text-sm text-[#D93B2F] font-semibold hover:underline">
            Refresh
          </button>
        </div>

        {claimMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${claimMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {claimMsg.text}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-[var(--card-bg)] rounded-2xl animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl font-bold text-[var(--text)] mb-2">No waitlist entries</p>
            <p className="text-[var(--muted)] mb-6 text-sm">
              When sold-out events have cancellations, you'll be notified here.
            </p>
            <a href="/events" className="bg-[#D93B2F] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-[#b02b20] transition">
              Browse Events
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.filter((e) => e.status === "NOTIFIED" || e.status === "AVAILABLE").length > 0 && (
              <p className="text-sm font-semibold text-green-700 bg-green-50 rounded-xl px-4 py-2">
                🎉 You have available tickets to claim!
              </p>
            )}
            {entries.map((e) => (
              <WaitlistCard key={e.id} entry={e} onClaim={handleClaim} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
