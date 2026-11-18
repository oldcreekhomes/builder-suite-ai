// Shared Review / Approved / Rejected / Late rules for every dashboard bill count
// (Accounting dashboard, PM dashboard, project Accounting Alerts, Bill Issues tab).

export interface BillIssueInput {
  status: string;
  due_date: string | null;
  is_reversal?: boolean | null;
  reversed_by_id?: string | null;
  archived_at?: string | null;
  terms?: string | null;
}

export const todayLocalStr = (now = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const dueStr = (d: string | null) => (d ? String(d).slice(0, 10) : null);

export const isCountableBill = (b: BillIssueInput) => !b.archived_at && !b.is_reversal && !b.reversed_by_id;

/** Late = any unpaid bill in Review or Approved past its due date. */
export const isLateBill = (b: BillIssueInput, today: string) => {
  if (b.status !== "draft" && b.status !== "posted") return false;
  if (b.archived_at || b.terms === "paid-at-purchase") return false;
  const d = dueStr(b.due_date);
  return !!d && d < today;
};

export const isRejectedBill = (b: BillIssueInput) => b.status === "void";

/** Review = bill waiting for approval (Manage Bills "Review" tab). */
export const isReviewBill = (b: BillIssueInput) => b.status === "draft";

/** Approved = approved, unpaid bill (Manage Bills "Approved" tab). */
export const isApprovedBill = (b: BillIssueInput) => b.status === "posted";

/** Whole days past due (0 when not late or no due date). */
export const daysLate = (dueDate: string | null, today: string) => {
  const d = dueStr(dueDate);
  if (!d || d >= today) return 0;
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`);
  return Math.round(ms / 86400000);
};
