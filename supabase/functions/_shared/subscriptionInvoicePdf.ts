// Server-side twin of src/components/settings/pdf/SubscriptionInvoicePdfDocument.tsx.
// The two layouts MUST stay identical so emailed and downloaded invoices match.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";

export interface InvoicePdfData {
  id: string;
  date: string | null;
  amount: number;
  status: string;
  description: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  billingEmail: string;
  companyName?: string | null;
}

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = { text: hex("#1a1a1a"), muted: hex("#6b7280"), faint: hex("#9ca3af"), line: hex("#f3f4f6"), line2: hex("#e5e7eb"), green: hex("#059669"), paidFg: hex("#065f46"), paidBg: hex("#d1fae5"), otherFg: hex("#92400e"), otherBg: hex("#fef3c7") };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export async function buildSubscriptionInvoicePdf(inv: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page: PDFPage = doc.addPage([612, 792]);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const L = 40, R = 572;
  let y = 792 - 40;

  const txt = (s: string, x: number, yy: number, f: PDFFont, size: number, color = C.text) => page.drawText(s, { x, y: yy, font: f, size, color });
  const right = (s: string, yy: number, f: PDFFont, size: number, color = C.text) => txt(s, R - f.widthOfTextAtSize(s, size), yy, f, size, color);
  const spaced = (s: string, x: number, yy: number, f: PDFFont, size: number, color: any, alignRight = false) => {
    const w = s.split("").reduce((a, ch) => a + f.widthOfTextAtSize(ch, size) + 1, -1);
    let cx = alignRight ? R - w : x;
    for (const ch of s) { txt(ch, cx, yy, f, size, color); cx += f.widthOfTextAtSize(ch, size) + 1; }
  };

  // Header
  txt("BuilderSuite ML", L, y - 22, bold, 22);
  txt("Subscription Invoice", L, y - 40, reg, 11, C.muted);
  spaced("INVOICE", 0, y - 10, reg, 10, C.muted, true);
  right(inv.id, y - 23, reg, 9, C.faint);
  y -= 40 + 30;

  // Bill To
  spaced("BILL TO", L, y - 9, bold, 9, C.muted);
  y -= 9 + 8;
  if (inv.companyName) { txt(inv.companyName, L, y - 11, bold, 11); y -= 14; }
  txt(inv.billingEmail, L, y - 11, reg, 11, C.muted);
  y -= 14 + 20;

  // Details
  spaced("INVOICE DETAILS", L, y - 9, bold, 9, C.muted);
  y -= 9 + 8;
  const row = (label: string, value: string, badge?: "paid" | "other") => {
    txt(label, L, y - 6 - 11, reg, 11, C.muted);
    if (badge) {
      const w = bold.widthOfTextAtSize(value, 9) + 12;
      page.drawRectangle({ x: R - w, y: y - 20, width: w, height: 14, color: badge === "paid" ? C.paidBg : C.otherBg });
      right(value, y - 16, bold, 9, badge === "paid" ? C.paidFg : C.otherFg);
      txt("", 0, 0, reg, 1);
    } else right(value, y - 6 - 11, bold, 11);
    y -= 26;
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: C.line });
  };
  row("Date", inv.date ? fmt(inv.date) : "N/A");
  if (inv.periodStart && inv.periodEnd) row("Billing Period", `${fmt(inv.periodStart)} – ${fmt(inv.periodEnd)}`);
  row("Status", (inv.status || "unknown").toUpperCase(), inv.status === "paid" ? "paid" : "other");
  row("Billing Email", inv.billingEmail);
  if (inv.cardLast4) row("Paid With", `${(inv.cardBrand || "Card").replace(/^\w/, (c) => c.toUpperCase())} ending in ${inv.cardLast4}`);
  y -= 20;

  // Description
  spaced("DESCRIPTION", L, y - 9, bold, 9, C.muted);
  y -= 9 + 8;
  const amount = `$${inv.amount.toFixed(2)}`;
  row(inv.description, amount);
  y -= 6;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 2, color: C.line2 });
  txt("Total Paid", L, y - 10 - 14, bold, 14);
  right(amount, y - 10 - 14, bold, 14, C.green);
  y -= 34 + 40;

  const foot = "This is a receipt for your records. Thank you for your subscription!";
  txt(foot, (612 - reg.widthOfTextAtSize(foot, 10)) / 2, y - 10, reg, 10, C.faint);

  return await doc.save();
}
