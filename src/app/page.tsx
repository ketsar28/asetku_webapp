import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
export default async function Home() {
  const s = await getSession();
  redirect(!s ? "/login" : s.role === "user" ? "/portal" : s.role === "employee" ? "/overtime" : s.role === "finance" ? "/finance" : "/dashboard");
}
