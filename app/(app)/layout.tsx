import AppSidebar from "@/components/shared/app-sidebar";
import MobileTopBar from "@/components/shared/mobile-top-bar";
import MobileTabBar from "@/components/shared/mobile-tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Left sidebar — desktop only */}
      <AppSidebar />

      {/* Mobile top bar — mobile only */}
      <MobileTopBar />

      {/* Main content — offset by sidebar on desktop */}
      <main className="md:ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}
