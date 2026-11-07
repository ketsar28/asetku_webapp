import { prisma } from "./prisma";
export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!process.env.SMTP_HOST) return;
  const nm = (await import("nodemailer")).default; const port = Number(process.env.SMTP_PORT ?? 587);
  await nm.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined })
    .sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject: `[AsetKu] ${subject}`, text, html: html || undefined });
}
export async function sendWA(phone: string, message: string) {
  const token = process.env.FONNTE_TOKEN; if (!token) return;
  await fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: token }, body: new URLSearchParams({ target: phone.replace(/\D/g, "").replace(/^0/, "62"), message, countryCode: "62" }) });
}
/** Notifikasi in-app + email + WhatsApp (yang terkonfigurasi). `ref` mencegah notifikasi ganda. Tidak pernah melempar error. */
export async function notify(userId: number, title: string, body: string, o: { link?: string; ref?: string; external?: boolean } = {}) {
  try { await prisma.notification.create({ data: { userId, title, body, link: o.link ?? null, ref: o.ref ?? null } }); }
  catch (e: any) { if (e?.code !== "P2002") console.error(e); return; }
  if (o.external === false) return;
  const u = await prisma.user.findUnique({ where: { id: userId } }); if (!u) return;
  const r = await Promise.allSettled([sendEmail(u.email, title, body), u.phone ? sendWA(u.phone, `*${title}*\n${body}`) : Promise.resolve()]);
  r.forEach((x) => x.status === "rejected" && console.error("Notif eksternal gagal:", x.reason));
}
export async function notifyRoles(roles: ("admin" | "staff" | "finance")[], title: string, body: string, link?: string) {
  for (const u of await prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } })) await notify(u.id, title, body, { link, external: false });
}
/** Email dengan lampiran (mis. laporan bulanan .xlsx). */
export async function sendReportMail(to: string, subject: string, text: string, filename: string, content: Buffer) {
  if (!process.env.SMTP_HOST) return;
  const nm = (await import("nodemailer")).default; const port = Number(process.env.SMTP_PORT ?? 587);
  await nm.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined })
    .sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject: `[AsetKu] ${subject}`, text, attachments: [{ filename, content }] });
}
