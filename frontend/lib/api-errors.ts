import { ApiError } from "@/lib/api/client";
import { getCopy } from "@/lib/copy";

/**
 * Turns anything an API call can throw into one sentence for the user.
 *
 * The backend answers in a mix of English and Thai, and some of its messages
 * are field-level validation meant for developers. The interface is English, so
 * known messages map to copy here; an unknown Thai message falls back to a line
 * chosen by HTTP status. English messages below 500 pass through when they are
 * written for people ("An offered item is no longer available"); developer-facing
 * validation and token errors fall back by status as well.
 */
const t = getCopy("errors");

// Patterns are anchored so a longer message never matches a shorter key by
// accident. Names after the key label the capture groups, in order, as copy
// parameters.
const KNOWN: ReadonlyArray<readonly [RegExp, string, ...string[]]> = [
  [/^อีเมลหรือรหัสผ่านไม่ถูกต้อง$/, "wrongCredentials"],
  [/^อีเมลนี้เคยลงทะเบียนแล้ว$/, "emailTaken"],
  [/^OTP ไม่ถูกต้องหรือหมดอายุแล้ว$/, "otpInvalid"],
  [/^ไม่พบ OTP ที่ยังไม่หมดอายุ/, "otpMissing"],
  [/^ไม่พบบัญชีผู้ใช้สำหรับอีเมลนี้$/, "noAccountForEmail"],
  [/^บัญชีนี้ถูกลบไปแล้ว$/, "accountDeleted"],
  [/^ไม่พบบัญชีผู้ใช้$/, "accountNotFound"],
  [/^PromptPay ต้องเป็นเบอร์มือถือ 10 หลัก/, "promptPayFormat"],
  [/^เบอร์ PromptPay นี้ถูกใช้กับบัญชีอื่นแล้ว$/, "promptPayTaken"],
  [/^ยังลบ PromptPay ไม่ได้/, "promptPayInUse"],
  [/^กรุณาตั้งค่า PromptPay.*รับข้อเสนอที่มีเงินเพิ่ม/, "promptPayRequiredForCash"],
  [/^กรุณาตั้งค่า PromptPay/, "promptPayRequired"],
  [/^ผู้ขายยังไม่ได้ตั้งค่า PromptPay/, "sellerNoPromptPay"],
  [/^ต้องใช้อีเมลมหาวิทยาลัยเกษตรศาสตร์/, "kuEmailOnly"],
  [/^กรุณากรอกรหัสผ่าน$/, "passwordRequired"],
  [/^รหัสผ่านต้อง(มีอย่างน้อย 8|ไม่เกิน 64) ตัวอักษร$/, "passwordLength"],
  [/^รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข/, "passwordLetterDigit"],
  [/^OTP ต้องมี 6 หลัก$/, "otpLength"],
  [/^QR ไม่ถูกต้อง$/, "handoverQrInvalid"],
  [/^QR หมดอายุ$/, "handoverQrExpired"],
  [/^ต้องแนบลิงก์รูปหลักฐานการโอนเงิน$/, "slipRequired"],
  [/^อัปโหลดรูปภาพไม่สำเร็จ$/, "uploadFailed"],
  [/^ขนาดไฟล์ต้องไม่เกิน 5MB$/, "fileTooLarge"],
  [/^รองรับเฉพาะไฟล์ JPEG, PNG, WEBP/, "fileType"],
  [/^ต้องแนบไฟล์รูปภาพมาด้วย/, "fileMissing"],
  [/^ส่งรูปภาพได้สูงสุด 5 รูปต่อข้อความ$/, "tooManyImages"],
  [/^ข้อความต้องมี content หรือ image_urls/, "emptyMessage"],
  [/^Message must contain at least/, "emptyMessage"],
  [/^คุณไม่ได้อยู่ในห้องแชทนี้$/, "notInChat"],
  [/^สินค้าไม่มีเหลือแล้ว$/, "outOfStock"],
  [/^สินค้าเหลือไม่เพียงพอ$/, "notEnoughStock"],
  [/^สินค้านี้ถูกลบไปแล้ว$/, "itemDeleted"],
  [/^ไม่พบสินค้า$/, "itemNotFound"],
  [/^ไม่พบโพสต์$/, "postNotFound"],
  [/^เจ้าของโพสต์ไม่สามารถซื้อสินค้าของตัวเองได้$/, "ownPostBuy"],
  [/^เจ้าของโพสต์ไม่สามารถเสนอแลกสินค้าของตัวเองได้$/, "ownPostOffer"],
  [/^เจ้าของโพสต์ไม่สามารถรับ offer ของตัวเองได้$/, "ownOfferAccept"],
  [/^โพสต์นี้รองรับการซื้อเท่านั้น$/, "sellOnly"],
  [/^โพสต์นี้รองรับการแลกเปลี่ยนเท่านั้น$/, "tradeOnly"],
  [/^โพสต์นี้ไม่ได้ตั้งราคาขาย$/, "noPrice"],
  [/^offer นี้ไม่ได้อยู่ในสถานะ Pending$/, "offerNotPending"],
  [/^ไม่พบ offer/, "offerNotFound"],
  [/^ไม่พบสินค้าที่ใช้เสนอแลกบางรายการ$/, "offeredItemsMissing"],
  [/^สินค้าที่ใช้เสนอแลกต้องเป็นของผู้เสนอเท่านั้น$/, "offeredItemsNotYours"],
  [/^ลบโพสต์ที่มี offer หรือ transaction แล้วไม่ได้$/, "deletePostWithDeals"],
  [/^ลดจำนวนได้ต่ำสุด (\d+) ชิ้น/, "quantityBelowSold", "sold"],
  [/^เพิ่มจำนวนเกินกว่าสต็อกที่เหลืออยู่/, "quantityAboveStock"],
  [/^ไม่มีข้อมูลที่จะแก้ไข$/, "nothingToUpdate"],
  [/^รายงานได้สูงสุด (\d+) ครั้ง/, "reportRateLimit", "limit"],
  [/^คำขอนี้ถูกตรวจสอบไปแล้ว$/, "requestReviewed"],
  [/^ไม่พบคำขอนี้$/, "requestNotFound"],
  [/^มีคำขอสมัครสมาชิกที่รอตรวจสอบอยู่แล้ว/, "membershipPending"],
  [/^ยอดเงิน ([\d.,]+) บาท ไม่ตรงกับ tier/, "membershipAmount", "amount"],
  [/^ไม่พบข้อมูลสมาชิกของผู้ใช้นี้/, "membershipMissing"],
  [/^ไม่พบโพสต์แจกของ$/, "giveawayNotFound"],
  [/^(การลงทะเบียนปิดไปแล้ว|กิจกรรมนี้ปิดรับแล้ว)$/, "giveawayClosed"],
  [/^กิจกรรมนี้ไม่ได้เปิดรับลงทะเบียนอยู่$/, "giveawayNotOpen"],
  [/^ยังไม่ถึงเวลาลงทะเบียน$/, "giveawayNotStarted"],
  [/^ผู้ใช้นี้เข้าร่วมแล้ว$/, "giveawayAlreadyJoined"],
  [/^ผู้ให้ไม่สามารถลงทะเบียนรับของตนเอง$/, "giveawayOwnJoin"],
  [/^สิทธิ์รับของครบแล้ว$/, "giveawayFull"],
  [/^เฉพาะผู้ให้เท่านั้นที่/, "giveawayGiverOnly"],
  [/^ปิดรับลงทะเบียนก่อนกำหนดได้เฉพาะวิธี/, "giveawayEarlyClose"],
  [/^โพสต์นี้ไม่ได้ใช้วิธี Manual$/, "giveawayNotManual"],
  [/^โพสต์นี้ไม่ได้ใช้วิธี Random$/, "giveawayNotRandom"],
  [/^เลือกผู้รับได้สูงสุด (\d+) คน$/, "giveawayMaxRecipients", "count"],
  [/^ต้องระบุ receiver_ids$/, "giveawayNoRecipients"],
  [/^ผู้รับบางคนไม่มี ticket ที่รอการเลือก$/, "giveawayRecipientsNotWaiting"],
  [/^ยังไม่ถึงเวลารับของ$/, "pickupNotStarted"],
  [/^เลยกำหนด(เวลา)?รับของแล้ว$/, "pickupOver"],
  [/^ticket นี้ไม่ได้อยู่ในสถานะพร้อมรับของ$/, "ticketNotReady"],
  [/^ไม่พบ ticket/, "ticketNotFound"],
  [/^QR ไม่ถูกต้องหรือตั๋วถูกใช้แล้ว$/, "ticketInvalid"],
  [/^เปิด QR ของผู้รับคนอื่นไม่ได้$/, "ticketOthers"],
  [/^ต้องยืนยันการสละสิทธิ์$/, "forfeitConfirm"],
  [/^สละสิทธิ์ของผู้รับคนอื่นไม่ได้$/, "forfeitOthers"],
];

const THAI = /[\u0E00-\u0E7F]/;
// Field-level validation written for developers: a snake_case field name, or
// class-validator's "must be" / "should not" / "is required" phrasing.
const TECHNICAL = /\b[a-z]+_[a-z_]+\b|\b(must|should) (not )?(be|contain)\b|\bis required\b|^Invalid (query|token)|^No token/i;
// What fetch() rejects with when the API cannot be reached (undici on the
// server, browsers on the client). Other TypeErrors are bugs, not outages.
const NETWORK = /fetch failed|Failed to fetch|NetworkError|Load failed/i;
const STATUS_KEYS = new Set([400, 401, 403, 404, 409, 429]);

function byStatus(status: number): string {
  if (status >= 500) return t("status.500");
  return STATUS_KEYS.has(status) ? t(`status.${status}`) : t("status.400");
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    for (const [pattern, key, ...names] of KNOWN) {
      const match = err.message.match(pattern);
      if (!match) continue;
      const params: Record<string, string> = {};
      names.forEach((name, i) => (params[name] = match[i + 1]));
      return t(`api.${key}`, params);
    }
    if (
      err.status !== 401 &&
      err.status < 500 &&
      err.message &&
      !THAI.test(err.message) &&
      !TECHNICAL.test(err.message)
    ) {
      return err.message;
    }
    return byStatus(err.status);
  }
  // Thrown by the session guards in lib/actions/* when no access token exists.
  if (err instanceof Error && err.message === "Not signed in") {
    return t("signedOut");
  }
  if (err instanceof TypeError && NETWORK.test(err.message)) return t("network");
  return t("generic");
}
