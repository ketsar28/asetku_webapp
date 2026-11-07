import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
export type Session = { id: number; role: "admin" | "staff" | "finance" | "user" | "employee"; name: string };
const key = () => new TextEncoder().encode(process.env.JWT_SECRET!);
export const signToken = (s: Session) =>
  new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(key());
export async function getSession(): Promise<Session | null> {
  const t = cookies().get("token")?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key())).payload as unknown as Session; } catch { return null; }
}
