/**
 * Reports and moderation — proposal §7.
 *
 * The shape of this module follows one rule from §7.2: the platform does not
 * score, rank, or auto-triage anything. There is no trust score, no severity
 * model, no automatic action. A report is a queue entry, and every outcome is
 * an admin's own judgement. The only automated thing in the whole system is
 * the §7.3 rate limit, which exists to stop bots, not to weigh reports.
 */

/** §7.1 — users pick from a fixed list; free-text alone is not accepted. */
export const REPORT_REASONS = [
  {
    id: "no-payment",
    label: "ไม่จ่ายเงินหรือส่งสลิปปลอม",
    sub: "Payment not received, or a fake transfer slip",
  },
  {
    id: "no-item",
    label: "ไม่ส่งสินค้าหรือไม่รับสินค้า",
    sub: "Item not sent, or not received at handover",
  },
  {
    id: "not-as-described",
    label: "สินค้าไม่ตรงตามที่ตกลงหรือเป็นของปลอม",
    sub: "Item doesn't match what was agreed, or is counterfeit",
  },
  {
    id: "cancel-failed",
    label: "ยกเลิกธุรกรรมไม่สำเร็จ",
    sub: "Cancellation request wasn't honored by the other party",
  },
  {
    id: "refund-not-honored",
    label: "ตกลงคืนเงินแล้วแต่ไม่ได้รับคืนจริง",
    sub: "A refund was agreed but never actually sent",
  },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

export function reasonLabel(id: string): string {
  return REPORT_REASONS.find((reason) => reason.id === id)?.label ?? id;
}

/**
 * §2.5 — an admin decides at the account level only. There is deliberately no
 * "order a refund" or "force the item back" action: the platform never held
 * the money or the goods, so it has nothing to reverse.
 */
export type AdminAction =
  | "dismiss"
  | "warn"
  | "suspend-temporary"
  | "suspend-permanent";

export const ADMIN_ACTION_LABELS: Record<
  AdminAction,
  { th: string; en: string; detail: string }
> = {
  dismiss: {
    th: "ไม่มีความผิด",
    en: "Dismiss",
    detail: "ปิดเรื่องโดยไม่ลงโทษ และกู้คืนโพสต์ที่ถูกรายงานอย่างไม่เป็นธรรม",
  },
  warn: {
    th: "ตักเตือน",
    en: "Warn",
    detail: "ส่งคำเตือนไปยังบัญชีผู้ถูกรายงาน ยังใช้งานได้ตามปกติ",
  },
  "suspend-temporary": {
    th: "ระงับบัญชีชั่วคราว",
    en: "Suspend temporarily",
    detail: "ระงับการใช้งานตามระยะเวลาที่กำหนด",
  },
  "suspend-permanent": {
    th: "ระงับบัญชีถาวร",
    en: "Suspend permanently",
    detail: "ระงับถาวร เก็บประวัติไว้ในระบบ และล็อกอีเมลไม่ให้สมัครซ้ำ (§1.7)",
  },
};

export type ReportStatus = "open" | "resolved";

export interface ReportVerdict {
  action: AdminAction;
  byAdminId: string;
  at: string;
  note: string;
}

export interface Report {
  id: string;
  /** Reports usually hang off a trade, but §7 also covers reported posts. */
  tradeId?: string;
  postId?: string;
  reason: ReportReasonId;
  detail: string;
  evidenceCount: number;
  reporterId: string;
  reporterName: string;
  accusedId: string;
  accusedName: string;
  createdAt: string;
  status: ReportStatus;
  verdict?: ReportVerdict;
}

/** §7.3 — a technical brake on rapid-fire reporting, nothing more. */
export const REPORT_RATE_LIMIT = { maxReports: 5, windowMinutes: 10 } as const;

/** §7.4 — how long the punished party has to appeal. */
export const APPEAL_WINDOW_DAYS = 7;

export type AppealStatus = "pending" | "upheld" | "overturned";

export const APPEAL_STATUS_LABELS: Record<AppealStatus, { th: string; en: string }> = {
  pending: { th: "รอพิจารณา", en: "Pending" },
  upheld: { th: "ยืนตามผลเดิม", en: "Upheld" },
  overturned: { th: "กลับคำตัดสิน", en: "Overturned" },
};

export interface Appeal {
  id: string;
  reportId: string;
  filedById: string;
  filedByName: string;
  reason: string;
  filedAt: string;
  status: AppealStatus;
  /** §7.4 — whoever ruled first is barred from ruling on the appeal. */
  originalAdminId: string;
  decidedByAdminId?: string;
}

// TODO: replace with the real moderation queue from the API
export const REPORTS: Report[] = [
  {
    id: "report-1",
    tradeId: "trade-5",
    reason: "not-as-described",
    detail:
      "สินค้าที่ได้รับมีรอยแตกที่มุมจอ ซึ่งไม่ได้ระบุไว้ในโพสต์และไม่เห็นในรูปทั้ง 3 รูป",
    evidenceCount: 3,
    reporterId: "user-me",
    reporterName: "Mike R.",
    accusedId: "user-anan",
    accusedName: "Anan W.",
    createdAt: "2026-08-06T09:12:00+07:00",
    status: "open",
  },
  {
    id: "report-2",
    tradeId: "trade-9",
    reason: "no-payment",
    detail: "ผู้ซื้อส่งสลิปมาแต่สแกน QR บนสลิปแล้วไม่พบรายการโอนในระบบธนาคาร",
    evidenceCount: 1,
    reporterId: "user-me",
    reporterName: "Mike R.",
    accusedId: "user-pimchanok",
    accusedName: "Pimchanok D.",
    createdAt: "2026-08-06T11:40:00+07:00",
    status: "open",
  },
  {
    id: "report-3",
    tradeId: "trade-12",
    reason: "cancel-failed",
    detail: "ขอยกเลิกไปแล้วแต่อีกฝ่ายไม่ตอบ และยังไม่คืนเงินตามที่คุยกันในแชท",
    evidenceCount: 2,
    reporterId: "user-kanyarat",
    reporterName: "Kanyarat T.",
    accusedId: "user-me",
    accusedName: "Mike R.",
    createdAt: "2026-08-05T20:05:00+07:00",
    status: "resolved",
    verdict: {
      action: "warn",
      byAdminId: "admin-1",
      at: "2026-08-06T08:00:00+07:00",
      note: "หลักฐานยังไม่ชัดว่าเจตนาหลบเลี่ยง ตักเตือนให้ตอบคำขอภายในเวลาที่กำหนด",
    },
  },
  {
    // Decided but not yet appealed — the §7.4 window is open on this one.
    id: "report-4",
    tradeId: "trade-2",
    reason: "no-item",
    detail: "นัดรับแล้วไม่มาตามนัดสองครั้ง และไม่ตอบข้อความในแชทเลย",
    evidenceCount: 4,
    reporterId: "user-kritsada",
    reporterName: "Kritsada P.",
    accusedId: "user-me",
    accusedName: "Mike R.",
    createdAt: "2026-08-04T08:00:00+07:00",
    status: "resolved",
    verdict: {
      action: "suspend-temporary",
      byAdminId: "admin-2",
      at: "2026-08-05T09:00:00+07:00",
      note: "ไม่มาตามนัดซ้ำและไม่ตอบข้อความ ระงับบัญชีชั่วคราว 7 วัน",
    },
  },
  {
    id: "report-5",
    postId: "post-2",
    reason: "not-as-described",
    detail: "สงสัยว่าเป็นสินค้าปลอม รูปสินค้าดูไม่ตรงกับรุ่นที่ระบุ",
    evidenceCount: 2,
    reporterId: "user-ratchanon",
    reporterName: "Ratchanon S.",
    accusedId: "user-warisara",
    accusedName: "Warisara P.",
    createdAt: "2026-08-03T16:00:00+07:00",
    status: "resolved",
    verdict: {
      action: "warn",
      byAdminId: "admin-2",
      at: "2026-08-05T18:00:00+07:00",
      note: "ยังพิสูจน์ไม่ได้ว่าเป็นของปลอม ตักเตือนให้แนบหลักฐานความแท้ในโพสต์",
    },
  },
];

// TODO: replace with the real appeal queue from the API
export const APPEALS: Appeal[] = [
  {
    // Ruled by admin-2, so admin-2 is barred from hearing this appeal (§7.4).
    id: "appeal-2",
    reportId: "report-5",
    filedById: "user-warisara",
    filedByName: "Warisara P.",
    reason:
      "โพสต์ถูกรายงานว่าเป็นของปลอม แต่มีใบเสร็จร้านตัวแทนจำหน่ายยืนยันว่าเป็นของแท้",
    filedAt: "2026-08-06T07:30:00+07:00",
    status: "pending",
    originalAdminId: "admin-2",
  },
  {
    id: "appeal-1",
    reportId: "report-3",
    filedById: "user-me",
    filedByName: "Mike R.",
    reason:
      "ไม่ได้เพิกเฉย แต่ไม่ได้รับการแจ้งเตือนเพราะอีเมลเข้าโฟลเดอร์สแปม มีภาพหน้าจอยืนยัน",
    filedAt: "2026-08-06T09:00:00+07:00",
    status: "pending",
    originalAdminId: "admin-1",
  },
];

export function getReport(reportId: string): Report | undefined {
  return REPORTS.find((report) => report.id === reportId);
}

export function getAppeal(appealId: string): Appeal | undefined {
  return APPEALS.find((appeal) => appeal.id === appealId);
}

/** §7.2 — the queue is ordered by arrival time and nothing else. */
export function reportQueue(): Report[] {
  return [...REPORTS].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/** §7.4 — the appeal window, counted from when the verdict was delivered. */
export function appealDeadline(verdictAt: string): Date {
  const deadline = new Date(verdictAt);
  deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
  return deadline;
}

export function canAppeal(report: Report, now: Date = new Date()): boolean {
  if (!report.verdict || report.verdict.action === "dismiss") return false;
  if (APPEALS.some((appeal) => appeal.reportId === report.id)) return false;
  return now <= appealDeadline(report.verdict.at);
}

/**
 * §7.4 — the appeal must be judged by a different admin from the one who
 * handed down the original decision.
 */
export function canDecideAppeal(appeal: Appeal, adminId: string): boolean {
  return appeal.status === "pending" && appeal.originalAdminId !== adminId;
}
