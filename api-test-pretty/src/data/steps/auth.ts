import type { StepGroup } from '../types';

export const authStep: StepGroup = {
  id: 'auth',
  step: 1,
  title: 'เข้าสู่ระบบ',
  icon: 'key',
  description: 'ต้องทำก่อนเสมอ — verify OTP หรือ login สำเร็จจะเก็บ token ให้อัตโนมัติ',
  endpoints: [
    {
      id: 'auth-request-otp',
      method: 'POST',
      path: '/auth/register/request-otp',
      label: 'ขอรหัส OTP',
      needsAuth: false,
      fields: [
        { name: 'email', label: 'อีเมล', type: 'text', defaultValue: 'test.new@ku.th', required: true },
        { name: 'password', label: 'รหัสผ่าน (8-64 ตัว มีตัวอักษร+ตัวเลข)', type: 'text', defaultValue: 'test1234', required: true },
        { name: 'phone', label: 'เบอร์โทร (ไม่บังคับ)', type: 'text' },
      ],
      hint: 'เช็ค OTP จาก terminal ที่รัน backend (log ของ MailService หรืออีเมลจริงถ้าต่อ Resend แล้ว)',
      captures: [{ responseKeys: ['email'], sessionKey: 'email' }],
    },
    {
      id: 'auth-get-last-otp',
      method: 'GET',
      path: '/auth/dev/last-otp?email=:email',
      label: '🛠 (dev only) ดึง OTP ล่าสุดขึ้นมาดู — ไม่ต้องเปิด terminal เอง',
      needsAuth: false,
      params: [{ name: 'email', label: 'อีเมล', sessionKey: 'email' }],
      hint: 'ใช้แทนการเปิด terminal backend ไปดู log — endpoint นี้ปิดอัตโนมัติถ้า backend รันแบบ production',
      captures: [{ responseKeys: ['otp'], sessionKey: 'lastOtp' }],
    },
    {
      id: 'auth-verify-otp',
      method: 'POST',
      path: '/auth/register/verify-otp',
      label: 'ยืนยัน OTP',
      needsAuth: false,
      fields: [
        { name: 'email', label: 'อีเมล', type: 'text', defaultValue: 'test.new@ku.th', sessionKey: 'email', required: true },
        { name: 'otp', label: 'OTP 6 หลัก', type: 'text', sessionKey: 'lastOtp', required: true, placeholder: '482913' },
      ],
      captures: [
        { responseKeys: ['accessToken'], sessionKey: 'accessToken' },
        { responseKeys: ['email'], sessionKey: 'email' },
        { responseKeys: ['isAdmin'], sessionKey: 'isAdmin' },
      ],
    },
    {
      id: 'auth-login',
      method: 'POST',
      path: '/auth/login',
      label: 'เข้าสู่ระบบ (สำหรับ user ที่สมัครแล้ว)',
      needsAuth: false,
      fields: [
        { name: 'email', label: 'อีเมล', type: 'text', sessionKey: 'email', required: true },
        { name: 'password', label: 'รหัสผ่าน', type: 'text', required: true },
      ],
      captures: [
        { responseKeys: ['accessToken'], sessionKey: 'accessToken' },
        { responseKeys: ['email'], sessionKey: 'email' },
        { responseKeys: ['isAdmin'], sessionKey: 'isAdmin' },
      ],
    },
    {
      id: 'users-me',
      method: 'GET',
      path: '/users/me',
      label: 'ดูโปรไฟล์ของฉัน (มี promptpayId)',
      needsAuth: true,
    },
    {
      id: 'users-set-promptpay',
      method: 'PATCH',
      path: '/users/me',
      label: 'ตั้งค่า PromptPay (ต้องตั้งก่อนลงขาย)',
      needsAuth: true,
      fields: [
        {
          name: 'promptpay_id',
          label: 'เบอร์มือถือที่ผูก PromptPay',
          type: 'text',
          placeholder: '081-234-5678',
          required: true,
        },
      ],
      hint: 'รับเฉพาะเบอร์มือถือไทย 10 หลัก (มีขีดหรือเว้นวรรคได้) ถ้ายังไม่ตั้ง จะสร้างโพสต์ขายไม่ได้ และคนอื่นกดซื้อโพสต์ของเราไม่ได้',
    },
  ],
};
