import { z } from 'zod';

export const requestMembershipSchema = z.object({
  requestedTier: z.enum(['Silver', 'Gold', 'Diamond']), // Free ไม่ต้องขอ เป็น default อยู่แล้ว
  proofImageUrl: z.string().url('ต้องแนบลิงก์รูปหลักฐานการโอนเงิน'),
});

export const reviewMembershipSchema = z.object({
  approve: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
});

export type RequestMembershipPayload = z.infer<typeof requestMembershipSchema>;
export type ReviewMembershipPayload = z.infer<typeof reviewMembershipSchema>;
