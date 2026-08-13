# KU Marketplace — API Console

Frontend mock สำหรับทดสอบทุก endpoint ของ backend เป็นขั้นเป็นตอน มี navigate + progress
tracker ที่จำค่า (token, item_id, post_id, transaction_id ฯลฯ) จากขั้นก่อนหน้าให้อัตโนมัติ
แล้วเติมลงฟอร์มขั้นถัดไปให้เอง

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

เปิด http://localhost:3001 (backend ต้องรันอยู่ที่ :3000 พร้อมเปิด CORS ไว้แล้ว)

## โครงสร้าง

```
src/
├── lib/
│   ├── api.ts              # fetch wrapper — ยิงตรง ไม่ unwrap envelope (ไว้ตรวจสอบ)
│   └── session-store.ts    # จำ token/ID ทุกตัวที่ capture มาได้ ผ่าน localStorage
├── data/
│   ├── types.ts            # FieldDef / EndpointDef / StepGroup
│   └── steps/               # endpoint catalog แยกไฟล์ตาม module (แก้ที่นี่ถ้า backend เปลี่ยน)
├── components/
│   ├── Sidebar.tsx          # nav + progress rail (เช็คว่าขั้นไหนทำไปแล้ว)
│   ├── SessionPanel.tsx     # โชว์ค่าที่จำไว้ทั้งหมด
│   ├── EndpointForm.tsx     # ฟอร์มยิง endpoint 1 อัน + auto-capture ID จาก response
│   └── DynamicField.tsx     # render input ตาม field type
└── app/
    ├── page.tsx              # หน้าแรก/คู่มือ
    └── [stepId]/page.tsx     # หน้า module แต่ละอัน (dynamic route เดียวคุมทั้ง 9 module)
```

## วิธีใช้

1. เข้าหน้าแรกอ่านคู่มือคร่าวๆ แล้วกด **ขั้นที่ 1: เข้าสู่ระบบ**
2. ขอ OTP → เช็ค terminal backend (หรืออีเมลจริงถ้าต่อ Resend แล้ว) → ยืนยัน OTP
3. Token ถูกเก็บอัตโนมัติ ไปขั้นถัดไปได้เลย ทุกฟอร์มที่ต้อง item_id/post_id/transaction_id
   จะเติมค่าที่จำไว้ให้อัตโนมัติ (ดูที่กล่อง "ค่าที่จำไว้ในระบบ" บนสุดของทุกหน้า)
4. endpoint ที่มี tag สีแดง "admin" ต้องตั้ง `isAdmin = true` ให้ user นั้นตรง DB ก่อน
   แล้ว login/verify ใหม่เพื่อออก token ใบใหม่

## ถ้า backend เปลี่ยน endpoint/field

แก้ที่ `src/data/steps/<module>.ts` ไฟล์เดียว ไม่ต้องแตะ component ใดๆ เพราะฟอร์มทั้งหมด
render มาจาก field definition ในไฟล์นี้โดยอัตโนมัติ
