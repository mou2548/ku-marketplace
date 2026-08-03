# KU Marketplace — Backend (Auth only)

Package นี้ตัดเหลือแค่ Auth module ล้วนๆ (ไม่มี Report/Appeal, ไม่มี Membership)
ไม่รวม docker-compose/init.sql — ใช้ DB ที่มีอยู่แล้วตาม schema ของทีม

## Setup

```bash
npm install
npx prisma generate
npm run start:dev
```

`.env` มีมาให้พร้อมใช้แล้ว แก้ `DATABASE_URL` ให้ตรงกับ DB จริงของทีมก่อนรัน

## Endpoints

```
POST /api/auth/register/request-otp   { email, password, phone? }
POST /api/auth/register/verify-otp    { email, otp }
POST /api/auth/login                  { email, password }
```

โค้ดฝั่ง auth แก้ให้ตรงกับ schema จริงของทีมแล้ว (field เป็น snake_case ตาม
`init.sql` ของเพื่อน เช่น `user_id`, `password_hash`, `isadmin` ฯลฯ)

⚠️ `password_hash` ใน mock data ของ `init.sql` ต้นฉบับเป็นค่า mock
(`$2b$10$abcdefghijklmnopqrstuuu`) ไม่ใช่ bcrypt hash จริง — login ด้วย
user ที่ seed มาจาก mock data จะไม่ผ่านจนกว่าจะ generate hash จริงแทน
ต้อง **สมัครผ่าน OTP flow เอง** ถึงจะ login ได้จริง หรือ update
`password_hash` ใน DB ด้วย hash จริงก่อน

## โครงสร้าง

```
src/
├── auth/              # OTP register + login
├── common/            # response interceptor, current-user decorator, admin guard
├── mail/               # OTP sender (ยัง mock — log ออก console)
├── redis/              # เก็บ OTP ชั่วคราว
└── prisma/             # PrismaService (Prisma 7 driver adapter)
```
