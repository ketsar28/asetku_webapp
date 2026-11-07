import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { PASSWORD_HINT, passwordOk } from "@/lib/password";
export const POST = route(null, async (_s, req: Request) => {
  const { name, email, password, departmentId, phone } = await req.json();
  need(name && /^\S+@\S+\.\S+$/.test(email), "Nama/email tidak valid");
  need(passwordOk(password), PASSWORD_HINT);
  const u = await prisma.user.create({ data: { name, email, departmentId, phone: phone || null, passwordHash: await bcrypt.hash(password, 10) } });
  return { id: u.id };
});
