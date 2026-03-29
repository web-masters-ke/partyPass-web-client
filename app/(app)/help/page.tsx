"use client";
import { useState } from "react";

const FAQS = [
  {
    q: "How do I buy tickets?",
    a: "Browse parties on the Events page, select your ticket tier, choose the quantity, and proceed to checkout. We support M-Pesa STK Push (prompt to your phone) and M-Pesa Paybill.",
  },
  {
    q: "How does M-Pesa STK Push work?",
    a: "Enter your M-Pesa phone number at checkout. We'll send a payment request directly to your phone. Open it, enter your M-Pesa PIN, and the payment is confirmed automatically.",
  },
  {
    q: "Where are my tickets?",
    a: "Once payment is confirmed, your tickets appear in My Tickets. Each ticket has a unique QR code that gate staff scan at the entry.",
  },
  {
    q: "Can I transfer a ticket to a friend?",
    a: "Yes — open the ticket in My Tickets, tap Transfer, and enter your friend's email or phone number.",
  },
  {
    q: "What is the Loyalty Wallet?",
    a: "Every ticket purchase earns you loyalty points. Accumulate points to climb tiers (Bronze → Silver → Gold → Platinum → Diamond) and unlock exclusive rewards, free tickets, and discounts.",
  },
  {
    q: "How do I redeem rewards?",
    a: "Go to Loyalty Wallet → Rewards tab. Browse available rewards and tap Redeem if you have enough points. A redemption code or discount is applied automatically.",
  },
  {
    q: "I paid but have no tickets — what do I do?",
    a: "This can happen if the M-Pesa confirmation is delayed. Wait a few minutes and refresh My Tickets. If the issue persists, email us at support@partypass.ke with your M-Pesa reference.",
  },
  {
    q: "How do I become an organizer?",
    a: "Register with the Organizer option. You can link your own M-Pesa Paybill, Till number, or use the PartyPass platform wallet. Once approved, you can create events and manage your guest list.",
  },
  {
    q: "Can I get a refund?",
    a: "Refund policies are set by the event organizer. If the event is cancelled by the organizer, a full refund is processed within 3-5 business days to your M-Pesa.",
  },
  {
    q: "How do I contact support?",
    a: "Email us at support@partypass.ke or DM us on Instagram @partypass.ke. We're available Mon–Sat, 9am–8pm EAT.",
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🙋</div>
        <h1 className="text-3xl font-black mb-2">Help & FAQs</h1>
        <p className="text-[var(--muted)]">Got questions? We've got answers.</p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <a href="mailto:support@partypass.ke"
          className="card p-4 text-center hover:shadow-md transition-all cursor-pointer">
          <div className="text-2xl mb-1">✉️</div>
          <p className="font-bold text-sm">Email Support</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">support@partypass.ke</p>
        </a>
        <a href="https://instagram.com/partypass.ke" target="_blank" rel="noopener noreferrer"
          className="card p-4 text-center hover:shadow-md transition-all cursor-pointer">
          <div className="text-2xl mb-1">📸</div>
          <p className="font-bold text-sm">Instagram</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">@partypass.ke</p>
        </a>
      </div>

      {/* FAQ accordion */}
      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div key={i} className="card overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left">
              <span className="font-semibold text-sm pr-4">{faq.q}</span>
              <span className={`text-[var(--primary)] transition-transform ${open === i ? "rotate-45" : ""} flex-shrink-0 text-lg font-bold`}>+</span>
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 card p-5 text-center">
        <p className="font-bold mb-1">Still need help?</p>
        <p className="text-sm text-[var(--muted)]">Our support team responds within 2 hours during business hours.</p>
        <a href="mailto:support@partypass.ke" className="btn-primary inline-block mt-3">Contact Support</a>
      </div>
    </div>
  );
}
