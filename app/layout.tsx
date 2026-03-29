import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PartyPass — Your Ticket to Every Party",
  description: "Buy tickets, earn loyalty points, discover parties in Nairobi and beyond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full flex flex-col antialiased`}>
        {/* Apply dark class BEFORE first paint — beforeInteractive runs before hydration */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('pp-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
        }} />
        {children}
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: 12, background: "#1a1a1a", color: "#fff" } }} />
      </body>
    </html>
  );
}
