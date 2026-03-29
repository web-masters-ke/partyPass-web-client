"use client";
import { useEffect, useState } from "react";
import { groupBookingsApi, unwrap } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";

type GroupData = {
  id: string;
  name?: string;
  status: string;
  maxSize: number;
  creatorPaysAll: boolean;
  shareToken: string;
  event?: { id: string; title: string; startDateTime: string; coverImageUrl?: string };
  tier?: { name: string; price: number; currency: string };
  members: Array<{
    id: string;
    status: string;
    user?: { firstName?: string; lastName?: string };
  }>;
};

const MEMBER_BADGE: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  JOINED: "bg-yellow-100 text-yellow-700",
  DECLINED: "bg-red-100 text-red-500",
  INVITED: "bg-[var(--surface)] text-[var(--muted)]",
  EXPIRED: "bg-[var(--surface)] text-[var(--muted)]",
};

export default function GroupJoinPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    groupBookingsApi.getByToken(shareToken).then((r) => {
      setGroup(unwrap<GroupData>(r));
    }).catch(() => {
      setError("This group booking link is invalid or has expired.");
    }).finally(() => setLoading(false));
  }, [shareToken]);

  const handleJoin = async () => {
    setJoining(true); setJoinMsg(null);
    try {
      const r = await groupBookingsApi.join(shareToken);
      const d = unwrap<{ orderId?: string; groupId?: string }>(r);
      if (d.orderId) {
        router.push(`/orders/${d.orderId}`);
      } else {
        setJoinMsg({ type: "success", text: "Joined! Waiting for the host to complete payment." });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not join group";
      setJoinMsg({ type: "error", text: msg });
    } finally { setJoining(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#D93B2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--muted)] text-sm">Loading group…</p>
      </div>
    </main>
  );

  if (error || !group) return (
    <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Invalid Link</h2>
        <p className="text-[var(--muted)] text-sm mb-6">{error ?? "This group booking link is no longer valid."}</p>
        <a href="/events" className="bg-[#D93B2F] text-white px-6 py-2.5 rounded-full font-semibold text-sm">
          Browse Events
        </a>
      </div>
    </main>
  );

  const isFull = group.members.length >= group.maxSize;
  const isOpen = group.status === "OPEN" || group.status === "PARTIAL";
  const tierPrice = group.tier?.price ?? 0;
  const currency = group.tier?.currency ?? "KES";

  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 mb-4 shadow-sm border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-[#D93B2F]/10 text-[#D93B2F] font-bold px-3 py-1 rounded-full">Group Booking</span>
          </div>
          <h1 className="text-xl font-extrabold text-[var(--text)] mb-1">
            {group.name ?? group.event?.title ?? "Group Booking"}
          </h1>
          {group.event && (
            <p className="text-sm text-[var(--muted)]">{group.event.title}</p>
          )}

          <div className="border-t border-[var(--border)] mt-4 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">Ticket Tier</p>
              <p className="text-sm font-semibold text-[var(--text)]">{group.tier?.name ?? "General Admission"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--muted)]">Your Cost</p>
              <p className={`text-lg font-extrabold ${group.creatorPaysAll ? "text-green-600" : "text-[#D93B2F]"}`}>
                {group.creatorPaysAll ? "FREE (host pays)" : `${currency} ${tierPrice.toFixed(0)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 mb-4 shadow-sm border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[var(--text)]">Group Members</h2>
            <span className="text-sm text-[var(--muted)]">{group.members.length}/{group.maxSize}</span>
          </div>

          {/* Slot bar */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: group.maxSize }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < group.members.length ? "bg-[#D93B2F]" : "bg-[var(--border)]"}`} />
            ))}
          </div>

          <div className="space-y-2">
            {group.members.map((m) => {
              const name = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(" ") || "Member";
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D93B2F]/10 flex items-center justify-center text-sm font-bold text-[#D93B2F]">
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm text-[var(--text)] flex-1">{name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${MEMBER_BADGE[m.status] ?? "bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {m.status}
                  </span>
                </div>
              );
            })}
            {/* Empty slots */}
            {Array.from({ length: group.maxSize - group.members.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center text-gray-300 text-sm">
                  +
                </div>
                <span className="text-sm text-gray-300">Open slot</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share link */}
        <button
          onClick={copyLink}
          className="w-full bg-[var(--card-bg)] rounded-xl px-4 py-3 mb-4 border border-[var(--border)] flex items-center gap-3 hover:bg-[var(--surface)] transition"
        >
          <span className="text-[var(--muted)] text-lg">🔗</span>
          <span className="text-sm text-[var(--muted)] flex-1 text-left truncate">{shareToken}</span>
          <span className="text-xs font-semibold text-[#D93B2F]">{copied ? "Copied!" : "Copy link"}</span>
        </button>

        {/* Status / CTA */}
        {joinMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${joinMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {joinMsg.text}
          </div>
        )}

        {!isOpen ? (
          <div className="bg-[var(--surface)] rounded-xl px-4 py-4 text-center text-sm text-[var(--muted)]">
            🔒 This group is {group.status.toLowerCase()}
          </div>
        ) : isFull ? (
          <div className="bg-[var(--surface)] rounded-xl px-4 py-4 text-center text-sm text-[var(--muted)]">
            👥 Group is full ({group.maxSize}/{group.maxSize})
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-[#D93B2F] hover:bg-[#b02b20] text-white font-bold py-4 rounded-full transition disabled:opacity-60 text-base"
          >
            {joining ? "Joining…" : group.creatorPaysAll ? "Join Group (Free)" : "Join & Pay My Seat"}
          </button>
        )}
      </div>
    </main>
  );
}
