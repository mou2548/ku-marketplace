# My Project

Full-stack scaffold: Next.js (frontend) + NestJS (backend) + PostgreSQL

## Requirements

- **Node.js v20.x** — https://nodejs.org (เลือก LTS)
  เช็คด้วย: `node -v`
- **Docker + Docker Compose** — https://www.docker.com/products/docker-desktop

## Project Structure

```
my-project/
├── .gitattributes
├── .npmrc
├── docker-compose.yml
├── README.md
├── frontend/          # Next.js
└── backend/           # NestJS
```

## Setup

### 1. Clone repo

```bash
git clone <repo-url>
cd my-project
```

### 2. เช็ค Node version

```bash
node -v
```

ต้องขึ้น `v20.x.x` — ถ้าไม่ตรง ให้ลง Node 20 จาก https://nodejs.org ก่อน

### 3. ติดตั้ง dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

> ถ้า Node version ผิด `npm install` จะ error ทันที (มี `engine-strict=true` บังคับไว้)

### 4. รัน Database (Postgres ผ่าน Docker)

```bash
docker compose up -d postgres
```

เช็คว่ารันอยู่:
```bash
docker compose ps
```

### 5. รัน Dev Server

เปิด 2 terminal แยกกัน:

**Terminal 1 — Backend**
```bash
cd backend
npm run start:dev
```
รันที่ `http://localhost:4000`

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```
รันที่ `http://localhost:3000`

## Environment Variables

สร้างไฟล์ `.env` ในแต่ละโฟลเดอร์ (`frontend/.env`, `backend/.env`) ตามตัวอย่างใน `.env.example` (ถ้ามี) โดยเฉพาะค่าเชื่อมต่อฐานข้อมูล เช่น:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
```

## Common Commands

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `docker compose up -d postgres` | เปิด database |
| `docker compose down` | ปิด database |
| `docker compose logs -f postgres` | ดู log database |
| `npm run start:dev` (backend) | รัน Nest dev server พร้อม hot-reload |
| `npm run dev` (frontend) | รัน Next dev server พร้อม hot-reload |

## Notes

- **Line endings**: `.gitattributes` ตั้งค่าให้ทุกไฟล์ text เก็บเป็น LF เสมอ ไม่ว่าจะ commit จาก Windows หรือ Mac — ไม่ต้องตั้งค่าอะไรเพิ่มเอง
- **Node version**: โปรเจ็คนี้ไม่ได้ใช้ nvm — ทุกคนต้องลง Node 20 ตรงจาก nodejs.org เอง และเช็คด้วย `node -v` ก่อน install ทุกครั้งที่สลับเครื่อง/โปรเจ็ค
- **Docker**: ใช้แค่รัน Postgres ตอน dev เท่านั้น ยังไม่มี Dockerfile สำหรับ frontend/backend (จะเพิ่มตอนใกล้ deploy จริง)