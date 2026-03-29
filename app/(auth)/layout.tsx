import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white text-xs font-black">PP</span>
          </div>
          <span className="font-black text-lg">PartyPass</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">{children}</div>
    </div>
  );
}
