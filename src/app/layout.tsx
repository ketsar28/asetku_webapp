import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getSession } from "@/lib/auth";
import Sidebar from "./Sidebar";
import TenantNav from "./TenantNav";
import EmployeeNav from "./EmployeeNav";
import PwaRegister from "./PwaRegister";
const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font" });
export const metadata = { title: "AsetKu – Inventaris & Peminjaman Aset", authors: [{ name: "Rizaldi" }, { name: "M. Zidan Khalil Gibran" }, { name: "M. Ketsar Ali Abi Wahid" }, { name: "Ibrahim Saleh Siregar" }, { name: "Handika Nur Ichsan" }], creator: "Rizaldi, M. Zidan Khalil Gibran, M. Ketsar Ali Abi Wahid, Ibrahim Saleh Siregar, Handika Nur Ichsan", publisher: "Rizaldi, M. Zidan Khalil Gibran, M. Ketsar Ali Abi Wahid, Ibrahim Saleh Siregar, Handika Nur Ichsan", manifest: "/manifest.webmanifest", icons: { apple: "/icons/icon-192.png" }, appleWebApp: { capable: true, title: "AsetKu" } };
export const viewport = { themeColor: "#14342F", width: "device-width", initialScale: 1 };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return (
    <html lang="id" className={font.variable}><body className="font-sans"><PwaRegister />
      {s?.role === "employee" ? (
        <><EmployeeNav name={s.name} /><main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main></>
      ) : s?.role === "user" ? (
        <><TenantNav name={s.name} /><main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main></>
      ) : (
        <div className={s ? "lg:flex" : ""}>
          {s && <Sidebar role={s.role} name={s.name} />}
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      )}
    </body></html>
  );
}
