export const metadata = {
  title: "Privacy Policy — PartyPass",
  description: "PartyPass Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "48px 24px", color: "#111", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 40 }}>Last updated: March 31, 2026</p>

      <p>
        PartyPass ("<strong>we</strong>", "<strong>our</strong>", or "<strong>us</strong>") is operated by Web Masters KE.
        This Privacy Policy explains how we collect, use, and protect your personal information when you use the
        PartyPass mobile app and website (collectively, the "<strong>Service</strong>").
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>1. Information We Collect</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Account information:</strong> Name, email address, phone number, and password when you register.</li>
        <li><strong>Profile information:</strong> Profile photo and preferences you choose to provide.</li>
        <li><strong>Transaction data:</strong> Ticket purchases, M-Pesa payment references, and booking history.</li>
        <li><strong>Device information:</strong> Device type, operating system, and unique device identifiers.</li>
        <li><strong>Camera &amp; photos:</strong> Only when you explicitly use QR scanning or upload venue/event photos.</li>
        <li><strong>Usage data:</strong> Pages visited, features used, and interactions within the app.</li>
      </ul>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>2. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>To create and manage your account.</li>
        <li>To process ticket purchases and event bookings.</li>
        <li>To send event reminders and booking confirmations via push notification or SMS.</li>
        <li>To verify your identity at event gates via QR code.</li>
        <li>To improve the app and personalise your experience.</li>
        <li>To comply with legal obligations and prevent fraud.</li>
      </ul>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>3. Sharing Your Information</h2>
      <p>We do <strong>not</strong> sell your personal data. We share information only with:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Event organisers:</strong> Your name and ticket details to verify attendance.</li>
        <li><strong>Payment processors:</strong> M-Pesa (Safaricom) for processing payments securely.</li>
        <li><strong>Cloud providers:</strong> AWS for secure data storage (Kenya / EU regions).</li>
        <li><strong>Legal authorities:</strong> When required by Kenyan law or court order.</li>
      </ul>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>4. Data Retention</h2>
      <p>
        We retain your account data for as long as your account is active. Transaction records are kept for 7 years
        as required by Kenyan financial regulations. You may request deletion of your account at any time.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>5. Your Rights</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>Access, correct, or delete your personal data.</li>
        <li>Withdraw consent for marketing communications at any time.</li>
        <li>Request a copy of your data in a portable format.</li>
        <li>Lodge a complaint with the Kenya Office of the Data Protection Commissioner.</li>
      </ul>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>6. Security</h2>
      <p>
        We use industry-standard encryption (HTTPS/TLS) for all data in transit and AES-256 encryption for data
        at rest. Passwords are hashed using bcrypt and never stored in plain text. Access to production systems
        is restricted to authorised personnel only.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>7. Children's Privacy</h2>
      <p>
        PartyPass is intended for users aged 18 and above. We do not knowingly collect personal information
        from children under 18. If you believe a child has provided us with personal data, contact us immediately.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>8. Third-Party Links</h2>
      <p>
        The app may contain links to third-party services (e.g. event websites). We are not responsible for
        the privacy practices of those services and encourage you to read their policies.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. We will notify you of significant changes via the app or
        email. Continued use of the Service after changes constitutes acceptance of the updated policy.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>10. Contact Us</h2>
      <p>
        For any privacy-related questions or requests, contact us at:<br />
        <strong>Email:</strong> privacy@partypass.co.ke<br />
        <strong>Address:</strong> Web Masters KE, Nairobi, Kenya
      </p>

      <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid #eee", color: "#999", fontSize: 13 }}>
        © {new Date().getFullYear()} PartyPass by Web Masters KE. All rights reserved.
      </div>
    </main>
  );
}
