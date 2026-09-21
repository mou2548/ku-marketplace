import type { StepGroup } from '../types';

export const appointmentsStep: StepGroup = {
  id: 'appointments',
  step: 5,
  title: 'นัดหมาย (Appointment Cards)',
  icon: 'calendar',
  description: 'ผูกกับธุรกรรมที่เลือกนัดรับด้วยตนเอง (Meetup) — ต้องมี appointment_id ที่เกิดจากธุรกรรมนั้นแล้ว',
  endpoints: [
    { id: 'appt-list', method: 'GET', path: '/appointment-cards', label: 'ดูนัดหมายของฉันทั้งหมด', needsAuth: true },
    {
      id: 'appt-detail',
      method: 'GET',
      path: '/appointment-cards/:id',
      label: 'ดูนัดหมายเดียว',
      needsAuth: true,
      params: [{ name: 'id', label: 'Appointment ID', sessionKey: 'appointmentId' }],
    },
    {
      id: 'appt-respond',
      method: 'POST',
      path: '/appointment-cards/:id/respond',
      label: 'ตอบรับ/ปฏิเสธนัดหมาย',
      needsAuth: true,
      params: [{ name: 'id', label: 'Appointment ID', sessionKey: 'appointmentId' }],
      fields: [
        {
          name: 'response',
          label: 'คำตอบ',
          type: 'select',
          defaultValue: 'confirm',
          options: [
            { value: 'confirm', label: 'ยืนยันนัด' },
            { value: 'reject', label: 'ปฏิเสธนัด' },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'appt-qr-generate',
      method: 'POST',
      path: '/appointment-cards/:id/qr/generate',
      label: 'สร้าง QR สำหรับนัดหมายนี้',
      needsAuth: true,
      params: [{ name: 'id', label: 'Appointment ID', sessionKey: 'appointmentId' }],
      hint: 'proxy ไปที่ transaction QR ตัวจริง — เงื่อนไขเดียวกับ tx-qr-generate',
      captures: [{ responseKeys: ['token'], sessionKey: 'lastQrToken' }],
    },
  ],
};
