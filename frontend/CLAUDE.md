@AGENTS.md

# KU Marketplace — Frontend

โปรเจกต์ marketplace ของ KU สถานะปัจจุบัน: **fresh scaffold** จาก `create-next-app` ยังไม่มี feature จริง (หน้า `page.tsx` ยังเป็น default template) — เป็นจุดเริ่มต้นก่อนเริ่มพัฒนา

## Stack

- **Next.js 16** (App Router, `app/` directory) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@import "tailwindcss"` ใน `app/globals.css`, ใช้ `@theme inline`)
- **ESLint 9** flat config (`eslint-config-next`)
- Font: **Prompt** (ตัวหลัก, รองรับ Thai + Latin) / Geist Mono (monospace) ผ่าน `next/font/google`
- **shadcn/ui** — UI component library บังคับใช้สำหรับทุก component (init แล้ว: style `base-nova`, base color `neutral`, icon library `lucide-react`, ดูรายละเอียดใน Golden Rules ข้อ 8)
- Node.js **v20.x เท่านั้น** (บังคับด้วย `predev` script + `engines` ใน `package.json`)

⚠️ **Next.js เวอร์ชันนี้มี breaking changes จากที่โมเดลเคยเทรนมา** — ก่อนเขียนโค้ดที่เกี่ยวกับ API/convention ของ Next.js ให้เช็ค `node_modules/next/dist/docs/` ก่อนเสมอ (ดู `AGENTS.md`)

## โครงสร้างโปรเจกต์ (Monorepo)

```
ku-marketplace/
├── frontend/        # Next.js — คุณอยู่ที่นี่
│   └── app/         # App Router (layout.tsx, page.tsx, globals.css)
├── backend/         # NestJS 11 + Prisma 7 + PostgreSQL
└── docker-compose.yml  # Postgres สำหรับ dev เท่านั้น
```

- Frontend รันที่ `http://localhost:3000`, Backend (NestJS) รันที่ `http://localhost:4000`
- Backend ใช้ Prisma (`backend/prisma/schema.prisma`) — ปัจจุบันยังไม่มี model ใดๆ, ยังไม่ได้ต่อ Postgres จริง
- Database (Postgres) รันผ่าน `docker compose up -d postgres` จาก root — ยังไม่มี Dockerfile สำหรับ frontend/backend

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # start dev server (โหมด --turbopack ของ Next 16)
npm run build    # production build
npm run lint     # eslint
```

## Golden Rules (กฎเหล็กในการทำงาน)

1. **ห้าม Commit หรือ Push เองเด็ดขาด** — เมื่อถึงขั้นตอน commit/push ให้แจ้งผู้ใช้ดำเนินการเอง
2. **ตอบสั้น กระชับ ได้ใจความ** — เน้นผลลัพธ์ ไม่อธิบายยืดเยื้อหรือพูดซ้ำซาก
3. **ห้ามใช้ Emoji ในโค้ดเด็ดขาด** — ใช้ได้เฉพาะ hardcode string ที่จำเป็นเท่านั้น
4. **ห้ามใช้ Emoji บนหน้าเว็บ** — ให้ใช้ SVG หรือ Icon Library แทน (เช่น lucide-react)
5. **อัปเดต task.md / implementation_plan.md ทุกครั้ง** — เมื่อมีความคืบหน้าให้อัปเดตทันที
6. **จัดการ Token Limit** — หากใกล้เต็มลิมิตให้หยุดและแจ้งผู้ใช้ก่อน อย่าทำงานต่อโดยไม่แจ้ง
7. **ทำแผนก่อนแก้ทุกครั้ง (Plan-First)** — ก่อนแก้ไข code ทุกครั้ง ให้ใช้ `EnterPlanMode` เสนอแผนให้ผู้ใช้อนุมัติก่อนเสมอ ห้ามลงมือแก้ทันทีโดยไม่มีแผน ยกเว้น typo / one-liner fix ที่ชัดเจน
8. **ใช้ shadcn/ui ทุกครั้งที่ทำ UI** — ห้ามเขียน component เอง (custom) ถ้ามี component ของ shadcn ที่ทำหน้าที่เดียวกันอยู่แล้ว ต้องใช้ `npx shadcn@latest add <component>` เพื่อดึงเข้ามาในโปรเจกต์แทนการ copy-paste หรือเขียนใหม่ (init แล้ว — component อยู่ที่ `components/ui/`, alias `@/components/ui`, icon ใช้ `lucide-react` ตาม Golden Rule ข้อ 4)
