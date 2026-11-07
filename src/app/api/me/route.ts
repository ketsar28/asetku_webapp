import { route } from "@/lib/api";
export const GET = route(["admin", "staff", "finance", "user", "employee"], async (s) => s);
