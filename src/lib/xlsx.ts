import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
export type Col = { header: string; key: string; width?: number; fmt?: string };
export const RP = '"Rp" #,##0', DT = "dd/mm/yyyy hh:mm:ss", D = "dd/mm/yyyy";
/** Excel menyimpan tanggal tanpa zona waktu, jadi geser ke WIB agar jam yang tampil sesuai. */
export const wib = (d?: Date | null) => (d ? new Date(d.getTime() + 7 * 3600e3) : null);
export async function xlsxBuffer(sheet: string, cols: Col[], rows: Record<string, unknown>[], o: { sum?: string[]; balance?: [string, string] } = {}) {
  const wb = new ExcelJS.Workbook(); wb.creator = "AsetKu Corporate"; wb.created = new Date();
  const ws = wb.addWorksheet(sheet, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.fmt ? { numFmt: c.fmt } : {} }));
  const h = ws.getRow(1); h.height = 24;
  h.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14342F" } }; c.alignment = { vertical: "middle", wrapText: true }; });
  rows.forEach((r) => ws.addRow(r));
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  const n = rows.length, L = (k: string) => ws.getColumn(k).letter;
  if (o.sum?.length && n) {
    const t = ws.addRow({}); t.font = { bold: true }; t.getCell(1).value = "TOTAL";
    for (const k of o.sum) t.getCell(k).value = { formula: `SUM(${L(k)}2:${L(k)}${n + 1})` } as ExcelJS.CellFormulaValue;
    if (o.balance) { const b = ws.addRow({}); b.font = { bold: true }; b.getCell(1).value = "SALDO"; b.getCell(o.balance[0]).value = { formula: `${L(o.balance[0])}${n + 2}-${L(o.balance[1])}${n + 2}` } as ExcelJS.CellFormulaValue; }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
/** Membuat file .xlsx asli: judul kolom berwarna, filter, baris beku, angka & tanggal bertipe benar, plus baris TOTAL/SALDO berformula. */
export async function xlsxResponse(file: string, sheet: string, cols: Col[], rows: Record<string, unknown>[], o: { sum?: string[]; balance?: [string, string] } = {}) {
  const buf = await xlsxBuffer(sheet, cols, rows, o);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${file}.xlsx"` } });
}
