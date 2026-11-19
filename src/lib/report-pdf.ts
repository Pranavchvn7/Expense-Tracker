import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { pdfMoney, pdfSafe } from "@/lib/report-range";

// Server-side PDF generation with pdf-lib: pure JavaScript, no browser, no network, no files.
// Only standard fonts (Latin-1), so every string passes through pdfSafe() first.

export type PdfReport = {
  rangeLabel: string;
  currency: string;
  generatedOn: string; // YYYY-MM-DD
  filtered: boolean;
  days: number;
  spentMinor: number;
  incomeMinor: number;
  expenseCount: number;
  categories: { label: string; value: number; count: number }[];
  payments: { label: string; value: number; count: number }[];
  months: string[];
  monthlySpent: number[];
  monthlyIncome: number[];
  top: { description: string; amountMinor: number; date: string; category: string }[];
};

const A4: [number, number] = [595.28, 841.89];
const M = 48;
const INK = rgb(0.09, 0.11, 0.16);
const MUTED = rgb(0.4, 0.44, 0.5);
const LINE = rgb(0.86, 0.88, 0.91);
const BRAND = rgb(0.05, 0.58, 0.53);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (k: string) => `${MON[Number(k.slice(5, 7)) - 1] ?? ""} ${k.slice(0, 4)}`;

type Col = { x: number; align?: "right"; w: number };

class Writer {
  page!: PDFPage;
  y = 0;
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  constructor(doc: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M;
  }
  space(h: number) {
    if (this.y - h < M + 24) this.newPage();
  }
  fit(text: string, size: number, maxW: number, f: PDFFont) {
    let t = pdfSafe(text);
    if (f.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}...`, size) > maxW) t = t.slice(0, -1);
    return `${t}...`;
  }
  text(text: string, o: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; right?: number; maxW?: number } = {}) {
    const size = o.size ?? 10;
    const f = o.bold ? this.bold : this.font;
    const t = this.fit(text, size, o.maxW ?? A4[0] - 2 * M, f);
    const x = o.right !== undefined ? o.right - f.widthOfTextAtSize(t, size) : (o.x ?? M);
    this.page.drawText(t, { x, y: this.y, size, font: f, color: o.color ?? INK });
  }
  gap(h: number) {
    this.y -= h;
  }
  heading(t: string) {
    this.space(60);
    this.gap(14);
    this.text(t, { size: 13, bold: true });
    this.gap(6);
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness: 1, color: BRAND });
    this.gap(14);
  }
  row(cells: string[], cols: Col[], opts: { bold?: boolean; muted?: boolean } = {}) {
    this.space(16);
    cells.forEach((c, i) => {
      const col = cols[i] as Col;
      this.text(c, {
        size: 9.5,
        bold: opts.bold,
        color: opts.muted ? MUTED : INK,
        maxW: col.w,
        ...(col.align === "right" ? { right: col.x } : { x: col.x }),
      });
    });
    this.gap(5);
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness: 0.5, color: LINE });
    this.gap(11);
  }
}

export async function buildReportPdf(r: PdfReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Expense report ${r.rangeLabel}`));
  doc.setProducer("Expense Tracker");
  doc.setCreator("Expense Tracker");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);
  const right = A4[0] - M;
  const money = (n: number) => pdfMoney(n, r.currency);

  w.text("Expense report", { size: 20, bold: true, color: BRAND });
  w.gap(20);
  w.text(r.rangeLabel, { size: 13, bold: true });
  w.gap(15);
  w.text(`Currency: ${r.currency}   |   Generated: ${r.generatedOn}${r.filtered ? "   |   Filtered by category" : ""}`, { size: 9, color: MUTED });
  w.gap(8);

  w.heading("Summary");
  const sum: [string, string][] = [
    ["Total spent", money(r.spentMinor)],
    ["Number of expenses", String(r.expenseCount)],
    ["Average spent per day", money(Math.round(r.spentMinor / Math.max(r.days, 1)))],
  ];
  if (!r.filtered) {
    sum.splice(1, 0, ["Income", money(r.incomeMinor)]);
    sum.push(["Balance (income minus spending)", money(r.incomeMinor - r.spentMinor)]);
    sum.push(["Savings rate", r.incomeMinor > 0 ? `${Math.round(((r.incomeMinor - r.spentMinor) / r.incomeMinor) * 100)}%` : "n/a"]);
  }
  for (const [k, v] of sum) w.row([k, v], [{ x: M, w: 300 }, { x: right, align: "right", w: 180 }]);

  if (r.months.length > 1) {
    w.heading("By month");
    if (r.filtered) {
      const c: Col[] = [{ x: M, w: 200 }, { x: right, align: "right", w: 200 }];
      w.row(["Month", "Spent"], c, { bold: true });
      r.months.forEach((m, i) => w.row([monthName(m), money(r.monthlySpent[i] ?? 0)], c));
    } else {
      const c: Col[] = [{ x: M, w: 120 }, { x: M + 270, align: "right", w: 140 }, { x: M + 390, align: "right", w: 140 }, { x: right, align: "right", w: 140 }];
      w.row(["Month", "Income", "Spent", "Balance"], c, { bold: true });
      r.months.forEach((m, i) =>
        w.row([monthName(m), money(r.monthlyIncome[i] ?? 0), money(r.monthlySpent[i] ?? 0), money((r.monthlyIncome[i] ?? 0) - (r.monthlySpent[i] ?? 0))], c),
      );
    }
  }

  if (r.categories.length) {
    w.heading("Spending by category");
    const c: Col[] = [{ x: M, w: 230 }, { x: M + 300, align: "right", w: 60 }, { x: M + 420, align: "right", w: 120 }, { x: right, align: "right", w: 60 }];
    w.row(["Category", "Expenses", "Amount", "Share"], c, { bold: true });
    for (const k of r.categories) {
      w.row([k.label, String(k.count), money(k.value), `${r.spentMinor > 0 ? Math.round((k.value / r.spentMinor) * 100) : 0}%`], c);
    }
  }

  if (r.payments.length) {
    w.heading("Paid with");
    const c: Col[] = [{ x: M, w: 230 }, { x: M + 300, align: "right", w: 60 }, { x: right, align: "right", w: 150 }];
    w.row(["Method", "Expenses", "Amount"], c, { bold: true });
    for (const p of r.payments) w.row([p.label, String(p.count), money(p.value)], c);
  }

  if (r.top.length) {
    w.heading("Largest expenses");
    const c: Col[] = [{ x: M, w: 70 }, { x: M + 78, w: 220 }, { x: M + 305, w: 100 }, { x: right, align: "right", w: 130 }];
    w.row(["Date", "Description", "Category", "Amount"], c, { bold: true });
    for (const t of r.top) w.row([t.date, t.description, t.category, money(t.amountMinor)], c);
  }

  // Footer with page numbers on every page.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const t = `Expense Tracker  |  Page ${i + 1} of ${pages.length}`;
    p.drawText(t, { x: right - font.widthOfTextAtSize(t, 8), y: 28, size: 8, font, color: MUTED });
  });

  return doc.save();
}
