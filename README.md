# KU Marketplace

Next.js frontend, NestJS API, PostgreSQL and Redis. Features include accounts,
item listings, purchase/trade offers, transaction chat, appointments, giveaways,
membership, reports and appeals.

## Local setup (fresh clone)

Requires Node.js **20.19 or newer within Node 20**, npm, Docker and Docker Compose.
Run the following commands from the repository root:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
npm ci --prefix backend
npm ci --prefix frontend
docker compose up -d postgres redis
```

On PowerShell use `Copy-Item` instead of `cp`. Backend installation generates the
Prisma client automatically. PostgreSQL executes `init.sql` (schema and demo data)
only when its data volume is empty. Wait for the database to be ready; inspect
`docker compose logs postgres` if startup fails.

Open two terminals from the repository root:

```sh
npm run start:dev --prefix backend
```

```sh
npm run dev --prefix frontend
```

Open <http://localhost:3000>. The API listens on <http://localhost:4000>.
If you change the API port, update `PORT` in `backend/.env` and
`NEXT_PUBLIC_API_URL` in `frontend/.env.local`, then restart both servers.

## Demo accounts and integrations

Fresh databases include `user1@ku.th`, `user2@ku.th` and `admin1@ku.th`, with
password `KuDemo123!`. These are local demo accounts only. The suspended account
`user8@ku.th` can sign in only to view its profile and use the appeal flow;
marketplace actions remain blocked. Existing volumes keep their old data
and passwords; pulling this change does not overwrite them.

Registration and password reset require Redis. Without `RESEND_API_KEY`, local
OTP codes appear in the backend terminal. Real email delivery requires a Resend
key and an allowed recipient/sender configuration. Production requires the key.
Image uploads (including payment slips and chat images) require the three
Cloudinary settings documented in `backend/.env.example`.

Use unique token secrets and real service credentials for deployed environments.
Do not commit `.env` files. Never deploy the seeded demo database publicly.

```bash
docker compose up -d 
```

Docker does not rerun `init.sql` when you pull changes. Back up your database
before applying schema updates. The existing incremental SQL updates can be run
from the repository root in order:

```sh
docker compose exec -T postgres psql -U postgres -d mydb -v ON_ERROR_STOP=1 < backend/prisma/migrations/20260906190000_giveaway_capacity_and_ticket_states/migration.sql
docker compose exec -T postgres psql -U postgres -d mydb -v ON_ERROR_STOP=1 < backend/prisma/migrations/20260906193000_close_full_first_come/migration.sql
docker compose exec -T postgres psql -U postgres -d mydb -v ON_ERROR_STOP=1 < backend/prisma/migrations/20260909000000_item_quantity_and_soft_delete/migration.sql
docker compose exec -T postgres psql -U postgres -d mydb -v ON_ERROR_STOP=1 < backend/prisma/migrations/20260909010000_flow_notifications/migration.sql
docker compose exec -T postgres psql -U postgres -d mydb -v ON_ERROR_STOP=1 < backend/prisma/migrations/20260909020000_report_sanction/migration.sql
npm run prisma:generate --prefix backend
```

The redirection examples use a POSIX shell; on PowerShell pipe `Get-Content -Raw`
into the same Docker command. These migrations extend the schema from `init.sql`;
they are not a complete empty-database Prisma migration history. Do not use
`prisma migrate deploy` as a substitute for fresh initialization.

`docker compose down` stops services while retaining data. Avoid `down -v` unless
you intend to delete all local database and Redis data.

## Verification

```sh
npm test --prefix backend -- --runInBand
npm run build --prefix backend
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run test:e2e --prefix backend -- --runInBand
```

Integration tests create temporary isolated PostgreSQL schemas and use
namespaced Redis keys (never FLUSHDB). They require both PostgreSQL and Redis.
Set DATABASE_URL, REDIS_HOST and REDIS_PORT to dedicated test services before
running them. The legacy-upgrade test preserves original rows while applying
every incremental migration twice. Frontend builds fetch Google Fonts, so internet access is required.

See [the verification report](frontend/docs/verification-report.md) for executed
cases, browser evidence and remaining device/integration checks.

The optional API console runs on port 3001:

- **Line endings**: `.gitattributes` ตั้งค่าให้ทุกไฟล์ text เก็บเป็น LF เสมอ ไม่ว่าจะ commit จาก Windows หรือ Mac — ไม่ต้องตั้งค่าอะไรเพิ่มเอง
- **Node version**: โปรเจ็คนี้ไม่ได้ใช้ nvm — ทุกคนต้องลง Node 20 ตรงจาก nodejs.org เอง และเช็คด้วย `node -v` ก่อน install ทุกครั้งที่สลับเครื่อง/โปรเจ็ค
- **Docker**: ใช้แค่รัน Postgres ตอน dev เท่านั้น ยังไม่มี Dockerfile สำหรับ frontend/backend (จะเพิ่มตอนใกล้ deploy จริง)
