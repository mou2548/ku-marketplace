/**
 * Membership subscriptions — proposal §8 revenue channel 1.
 *
 * 49 baht a month, paid by PromptPay transfer to the team with the slip
 * attached, approved by an admin by hand. That is deliberate: it keeps the
 * platform off payment processors and their per-transaction fees, and it is
 * the same "money moves outside, evidence moves inside" pattern used for
 * trades (§8.1).
 */
export const MEMBERSHIP_PRICE_THB = 49;

/** §8 revenue 1.1 — what the subscription actually buys. */
export const MEMBERSHIP_BENEFITS = [
  "เพิ่มโควตาโพสต์พร้อมกันจาก 5 เป็น 20 รายการ",
  "โพสต์ของสมาชิกแสดงเหนือโพสต์ทั่วไปทั้งในฟีดและผลค้นหา",
  "สัญลักษณ์ยืนยันตัวตนกำกับชื่อทุกจุดที่ชื่อปรากฏ",
] as const;

export type MembershipRequestStatus = "pending" | "approved" | "rejected";

export interface MembershipRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  slipImage: string;
  amount: number;
  submittedAt: string;
  status: MembershipRequestStatus;
  reviewedByAdminId?: string;
  reviewedAt?: string;
}

// TODO: replace with the real membership queue from the API
export const MEMBERSHIP_REQUESTS: MembershipRequest[] = [
  {
    id: "membership-1",
    userId: "user-ploy",
    userName: "Nong Ploy",
    userEmail: "ploy.n@ku.th",
    slipImage: "/images/promptpay-qr.svg",
    amount: MEMBERSHIP_PRICE_THB,
    submittedAt: "2026-08-06T08:30:00+07:00",
    status: "pending",
  },
  {
    id: "membership-2",
    userId: "user-kritsada",
    userName: "Kritsada P.",
    userEmail: "kritsada.p@ku.ac.th",
    slipImage: "/images/promptpay-qr.svg",
    // Wrong amount — the kind of thing the manual check exists to catch.
    amount: 40,
    submittedAt: "2026-08-06T10:15:00+07:00",
    status: "pending",
  },
  {
    id: "membership-3",
    userId: "user-anan",
    userName: "Anan W.",
    userEmail: "anan.w@ku.th",
    slipImage: "/images/promptpay-qr.svg",
    amount: MEMBERSHIP_PRICE_THB,
    submittedAt: "2026-08-04T14:00:00+07:00",
    status: "approved",
    reviewedByAdminId: "admin-1",
    reviewedAt: "2026-08-04T15:20:00+07:00",
  },
];

export function pendingMembershipRequests(): MembershipRequest[] {
  return MEMBERSHIP_REQUESTS.filter((request) => request.status === "pending");
}
