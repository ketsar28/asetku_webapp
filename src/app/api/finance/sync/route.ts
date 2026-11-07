import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { loanIncomeTx } from "@/lib/finance";
/** Melengkapi buku kas dari data yang sudah ada (idempotent: tidak membuat duplikat). */
export const POST = route(["admin", "finance"], async (s) => {
  const have = new Set((await prisma.transaction.findMany({ where: { refNo: { not: null } }, select: { source: true, refNo: true } })).map((t) => `${t.source}|${t.refNo}`));
  const base = { createdBy: s!.id, createdByName: s!.name };
  const data: any[] = [];
  const add = (key: string, row: any) => { if (!have.has(key)) { have.add(key); data.push({ ...base, ...row }); } };
  for (const a of await prisma.asset.findMany({ where: { purchaseCost: { gt: 0 } } }))
    add(`purchase|${a.assetCode}`, { type: "expense", category: "Pembelian aset", amount: a.purchaseCost, description: `Pembelian ${a.name} (${a.assetCode})`, txDate: a.purchaseDate ?? a.createdAt, source: "purchase", assetId: a.id, refNo: a.assetCode });
  for (const l of await prisma.loanRequest.findMany({ where: { status: { in: ["on_loan", "overdue", "returned"] } }, include: { asset: true } })) {
    if (Number(l.rentalFee) > 0) for (const row of loanIncomeTx(l, l.asset.name, { paymentMethod: l.paymentMethod, bankName: l.bankName, accountName: l.accountName, accountNo: l.accountNo }, l.startDate, { id: s!.id, name: s!.name })) add(`${row.source}|${l.requestNumber}`, row);
    if (Number(l.fineAmount) > 0) add(`fine|${l.requestNumber}`, { type: "income", category: "Denda keterlambatan", amount: l.fineAmount, description: `Denda ${l.requestNumber}`, txDate: l.actualReturnDate ?? l.updatedAt, source: "fine", assetId: l.assetId, refNo: l.requestNumber });
  }
  for (const m of await prisma.maintenanceRecord.findMany({ where: { cost: { gt: 0 } } }))
    add(`maintenance|MT-${m.id}`, { type: "expense", category: "Perawatan aset", amount: m.cost, description: `Perawatan: ${m.description}`, txDate: m.completionDate ?? m.maintenanceDate, source: "maintenance", assetId: m.assetId, refNo: `MT-${m.id}` });
  if (data.length) await prisma.transaction.createMany({ data });
  return { added: data.length };
});
