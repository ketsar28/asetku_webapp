import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { payInfo, stamp } from "@/lib/finance";
import { audit } from "@/lib/audit";
import { payrollRecap, vatRecap } from "@/lib/tax";
export const GET = route(["admin", "finance"], async (_s, req: Request) => {
  const y = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear();
  return { year: y, vat: await vatRecap(y), payroll: await payrollRecap(y) };
});
/** Mencatat setoran PPN ke kas negara: mengurangi kewajiban PPN, bukan beban usaha. */
export const POST = route(["admin", "finance"], async (s, req: Request) => {
  const b = await req.json(); const amount = Math.round(Number(b.amount));
  need(/^\d{4}-(0[1-9]|1[0-2])$/.test(String(b.period)), "Masa pajak tidak valid"); need(amount > 0, "Nominal harus lebih dari 0");
  const t = await prisma.transaction.create({ data: { type: "expense", category: "Setoran PPN", amount, ...payInfo(b), description: `Setoran PPN masa ${b.period}${b.ntpn ? ` (NTPN ${b.ntpn})` : ""}`, txDate: stamp(b.date || new Date()), source: "tax_vat", refNo: `PPN-${b.period}`, createdBy: s!.id, createdByName: s!.name } });
  await audit({ id: s!.id, name: s!.name }, "tax_payment", "transaction", `Setoran PPN ${b.period}: Rp ${amount.toLocaleString("id-ID")}${b.ntpn ? ` NTPN ${b.ntpn}` : ""}`, t.id);
  return { ok: true };
});
