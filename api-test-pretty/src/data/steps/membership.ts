import type { StepGroup } from '../types';

export const membershipStep: StepGroup = {
  id: 'membership',
  step: 6,
  title: 'สมัครสมาชิก (Membership)',
  icon: 'star',
  description: 'endpoint ที่มี badge สีแดง "admin" ต้องใช้ token ของ user ที่ isAdmin=true',
  endpoints: [
    {
      id: 'membership-request',
      method: 'POST',
      path: '/membership/request',
      label: 'ยื่นขออัปเกรด tier',
      needsAuth: true,
      fields: [
        {
          name: 'requestedTier',
          label: 'Tier ที่ต้องการ',
          type: 'select',
          defaultValue: 'Gold',
          options: [
            { value: 'Silver', label: 'Silver — 29 บาท' },
            { value: 'Gold', label: 'Gold — 49 บาท' },
            { value: 'Diamond', label: 'Diamond — 89 บาท' },
          ],
          required: true,
        },
        {
          name: 'proofImageUrl',
          label: 'ลิงก์รูปหลักฐานการโอน',
          type: 'text',
          defaultValue: 'https://example.com/proof.jpg',
          sessionKey: 'lastUploadUrl',
          required: true,
        },
      ],
      captures: [{ responseKeys: ['paymentId'], sessionKey: 'paymentId', numeric: true }],
    },
    {
      id: 'membership-pending',
      method: 'GET',
      path: '/membership/payments/pending',
      label: 'ดูคิวที่รอตรวจ',
      needsAuth: true,
      needsAdmin: true,
    },
    {
      id: 'membership-review',
      method: 'POST',
      path: '/membership/payments/:id/review',
      label: 'อนุมัติ/ปฏิเสธ',
      needsAuth: true,
      needsAdmin: true,
      params: [{ name: 'id', label: 'Payment ID', sessionKey: 'paymentId' }],
      fields: [
        {
          name: 'approve',
          label: 'ผลการตรวจ',
          type: 'boolean',
          defaultValue: true,
          required: true,
        },
        { name: 'rejectionReason', label: 'เหตุผล (ถ้าปฏิเสธ)', type: 'text' },
      ],
    },
  ],
};
