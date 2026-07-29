<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Working Rules & Project Specification

อ่านไฟล์นี้ให้ครบก่อนเริ่มงานทุกครั้ง กฎเหล่านี้ใช้กับทุก session

## Golden Rules (กฎเหล็กในการทำงาน)

1. **ห้าม Commit หรือ Push เองเด็ดขาด** — เมื่อถึงขั้นตอน commit/push ให้แจ้งผู้ใช้ดำเนินการเอง
2. **ตอบสั้น กระชับ ได้ใจความ** — เน้นผลลัพธ์ ไม่อธิบายยืดเยื้อหรือพูดซ้ำซาก
3. **ห้ามใช้ Emoji ในโค้ดเด็ดขาด** — ใช้ได้เฉพาะ hardcode string ที่จำเป็นเท่านั้น
4. **ห้ามใช้ Emoji บนหน้าเว็บ** — ให้ใช้ SVG หรือ Icon Library แทน (เช่น lucide-react)
5. **อัปเดต task.md / implementation_plan.md ทุกครั้ง** — เมื่อมีความคืบหน้าให้อัปเดตทันที
6. **จัดการ Token Limit** — หากใกล้เต็มลิมิตให้หยุดและแจ้งผู้ใช้ก่อน อย่าทำงานต่อโดยไม่แจ้ง
7. **ทำแผนก่อนแก้ทุกครั้ง (Plan-First)** — ก่อนแก้ code ทุกครั้ง ใช้ EnterPlanMode เสนอแผนให้ผู้ใช้อนุมัติก่อนเสมอ ห้ามลงมือแก้ทันทีโดยไม่มีแผน ยกเว้น typo / one-liner fix ที่ชัดเจน
8. **ใช้ shadcn/ui ทุกครั้งสำหรับ UI Component** — ก่อนเขียน UI ใหม่ ให้ `npx shadcn@latest add <component>` มาใช้/ต่อยอดก่อนเสมอ ห้าม hand-roll component ที่ shadcn มีอยู่แล้ว (button, card, input, dialog ฯลฯ)

## Project Overview: KU Marketplace

Web Application ตลาดซื้อ-ขายสำหรับชุมชน (นักศึกษา/บุคลากร ม.เกษตร) — ลงประกาศสินค้า ค้นหา และติดต่อผู้ขาย

**สถานะปัจจุบัน: Scaffold** — ยังเป็นโครงเปล่า ยังไม่มี business logic
- Frontend = หน้า default ของ create-next-app
- Backend = NestJS boilerplate, route เดียว `GET /` ตอบ `Hello World!`
- `prisma/schema.prisma` ยังไม่มี model และยังไม่ได้ตั้ง `url`

**เป้าหมายถัดไป** (ยังไม่ทำ): กำหนด Prisma models, wire Nest modules (auth/listing/user), สร้างหน้า frontend, ต่อ frontend ↔ backend

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript Strict |
| Styling | TailwindCSS v4 |
| UI Components | shadcn/ui (บังคับใช้ — ดู Golden Rule 8), Tailwind v4, `components.json` alias `@/components` |
| Icons | lucide-react (no emoji on UI) |
| Backend | NestJS 11 (แยก service ต่างหากจาก frontend) |
| Database | Prisma 7 + PostgreSQL |
| DB (dev) | Postgres 16 ผ่าน Docker Compose (db `mydb`, port 5432) |
| Node | v20.x เท่านั้น (`engine-strict=true` + `predev` guard บังคับ) |

> **สำคัญ:** backend เป็น NestJS แยกออกมา ไม่ใช่ Next.js API Routes — logic ฝั่ง server อยู่ที่ `backend/src/` ไม่ใช่ `app/api/`

## Monorepo Structure

```
ku-marketplace/
├── docker-compose.yml     Postgres 16 เท่านั้น (dev)
├── frontend/              Next.js 16 (port 3000)
│   └── app/               App Router
└── backend/               NestJS 11 (port 4000)
    ├── src/               main.ts, app.module.ts, app.controller.ts, app.service.ts
    └── prisma/schema.prisma
```

## Database Schema

Schema อยู่ที่ `backend/prisma/schema.prisma` เก็บใน PostgreSQL

**สถานะ: ว่าง** — ยังไม่มี model. เมื่อออกแบบ ให้อัปเดตตารางนี้ทันที

| Model | เก็บอะไร |
|---|---|
| _(TBD)_ | User / Listing / Category ฯลฯ — ยังไม่นิยาม |

## Architecture & Key Files

### Frontend (`frontend/`)
```
app/layout.tsx    — Root layout
app/page.tsx      — Home (ยังเป็น default landing)
app/globals.css   — Tailwind v4 entry
next.config.ts    — Next config
```

### Backend (`backend/src/`)
```
main.ts            — Bootstrap NestFactory, listen PORT (default 3000 → ตั้ง 4000)
app.module.ts      — Root module
app.controller.ts  — GET / → getHello()
app.service.ts     — getHello() → "Hello World!"
prisma/schema.prisma — Prisma schema (postgresql)
prisma.config.ts   — Prisma 7 config (datasource url อยู่ที่นี่)
```

## Prisma 7 Breaking Changes (สำคัญมาก)

1. **ห้ามใส่ `url` ใน `schema.prisma` datasource block** — ย้ายไปใส่ใน `prisma.config.ts` แทน
2. **ต้อง run `npx prisma generate` แยกหลัง migrate** — ไม่ auto-generate อีกต่อไป
3. **Client generate ไปที่ `backend/generated/prisma`** (ตาม `output` ใน schema) — import ตาม path นั้น
4. เช็ค guide ล่าสุดก่อนแก้ schema/adapter ทุกครั้ง

## Environment Variables

สร้าง `.env` ในแต่ละโฟลเดอร์ (`frontend/.env`, `backend/.env`)

```
# backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb"
PORT=4000
```

## Run (Dev)

```bash
docker compose up -d postgres          # เปิด DB
cd backend && npm install && npm run start:dev   # port 4000
cd frontend && npm install && npm run dev        # port 3000
```

> ถ้า Node ไม่ใช่ v20 → `npm install` / `predev` จะ error ทันที
