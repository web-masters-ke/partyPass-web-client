"use client";
import { useEffect, useRef, useState } from "react";
import { waitingRoomApi, unwrap } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";

export default function QueuePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [entered, setEntered] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [entering, setEntering] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [queueSize, setQueueSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check if already in queue
    waitingRoomApi.status(eventId).then((r) => {
      const d = unwrap<{ entered?: boolean; admitted?: boolean; position?: number; queueSize?: number }>(r);
      if (d.admitted) { setAdmitted(true); onAdmitted(); }
      else if (d.position != null) { setEntered(true); setPosition(d.position); setQueueSize(d.queueSize ?? null); startPolling(); }
    }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [eventId]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await waitingRoomApi.status(eventId);
        const d = unwrap<{ admitted?: boolean; position?: number; queueSize?: number }>(r);
        setPosition(d.position ?? null);
        setQueueSize(d.queueSize ?? null);
        if (d.admitted) {
          clearInterval(pollRef.current!);
          setAdmitted(true);
          onAdmitted();
        }
      } catch {}
    }, 5000);
  };

  const onAdmitted = () => {
    setTimeout(() => router.push(`/events/${eventId}`), 2500);
  };

  const enterQueue = async () => {
    setEntering(true); setError(null);
    try {
      const r = await waitingRoomApi.enter(eventId);
      const d = unwrap<{ position?: number }>(r);
      setEntered(true); setPosition(d.position ?? null);
      startPolling();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not join queue");
    } finally { setEntering(false); }
  };

  const progress = position != null && queueSize != null && queueSize > 0
    ? Math.max(0, Math.min(1, (queueSize - position) / queueSize))
    : 0;

  if (admitted) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 text-5xl">✅</div>
          <h2 className="text-2xl font-extrabold text-[var(--text)] mb-3">You&apos;re In!</h2>
          <p className="text-[var(--muted)] text-sm">Redirecting you to the event page…</p>
          <div className="mt-6 h-1 w-full bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[#D93B2F] rounded-full animate-[grow_2.5s_linear_forwards]" style={{ width: "100%" }} />
          </div>
        </div>
      </main>
    );
  }

  if (entered) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          {/* Progress ring */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#E5E5E5" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54" fill="none" stroke="#D93B2F" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-3xl">⏳</div>
          </div>

          <h2 className="text-2xl font-extrabold text-[var(--text)] mb-2">You&apos;re in the Queue</h2>
          {position != null && (
            <div className="bg-[var(--card-bg)] rounded-2xl px-6 py-4 inline-block shadow-sm border border-[var(--border)] my-4">
              <p className="text-xs text-[var(--muted)] mb-1">Your Position</p>
              <p className="text-5xl font-black text-[#D93B2F]">#{position}</p>
              {queueSize && <p className="text-xs text-[var(--muted)] mt-1">of {queueSize} people</p>}
            </div>
          )}
          <p className="text-xs text-[var(--muted)] mt-4">Checking every 5 seconds…</p>

          <div className="mt-6 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-700 text-left">
            ⚠️ Keep this tab open. Closing it may cause you to lose your position.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 rounded-full bg-[#D93B2F]/10 flex items-center justify-center mx-auto mb-6 text-5xl">🎟️</div>
        <h2 className="text-2xl font-extrabold text-[var(--text)] mb-3">High Demand!</h2>
        <p className="text-[var(--muted)] text-sm mb-6 leading-relaxed">
          Tickets for this event are being released in batches due to high demand. Join the virtual queue to secure your spot.
        </p>
        {queueSize != null && (
          <div className="bg-[var(--card-bg)] rounded-xl px-4 py-2.5 inline-block mb-6 border border-[var(--border)] text-sm text-[var(--muted)] font-medium">
            {queueSize} people in queue
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
        )}
        <button
          onClick={enterQueue}
          disabled={entering}
          className="w-full bg-[#D93B2F] hover:bg-[#b02b20] text-white font-bold py-4 rounded-full transition disabled:opacity-60 text-base"
        >
          {entering ? "Joining Queue…" : "Join the Queue"}
        </button>
        <p className="text-xs text-[var(--muted)] mt-4">
          Keep this page open — you&apos;ll be notified when it&apos;s your turn.
        </p>
      </div>
    </main>
  );
}
