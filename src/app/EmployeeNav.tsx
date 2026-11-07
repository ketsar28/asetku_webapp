"use client";
import Link from "next/link";
import NotifBell from "./NotifBell";
import { usePathname } from "next/navigation";
export default function EmployeeNav({ name }: { name: string }) {
  const path = usePathname();
  const items = [["/overtime", "Input Lembur"], ["/reimburse", "Reimburse"], ["/profile", "Profil"]];
  return (
    <header className="sticky top-0 z-40 border-b bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <img src="/logo.png" alt="AsetKu Corporate" className="h-10 w-auto" />
        <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {items.map(([h, l]) => <Link key={h} href={h} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${path.startsWith(h) ? "bg-moss text-white" : "text-slate-600 hover:bg-paper"}`}>{l}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm"><NotifBell /><span className="hidden text-slate-500 sm:inline">{name}</span>
          <button className="font-semibold text-red-700" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; }}>Keluar</button></div>
      </div>
    </header>
  );
}
