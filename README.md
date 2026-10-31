# KU Marketplace

KU Marketplace is a full-stack marketplace backend + frontend built with NestJS, Next.js, Prisma, PostgreSQL, Redis, and Resend. The application supports item listings, marketplace trading, giveaways, memberships, transactions, reports, appeals, and OTP-based auth.

## 1. Product Domain

Primary public site:
- https://ku-market.phumitada.com

Recommended public API entry point:
- https://api.ku-market.phumitada.com

Email domain for transactional mail:
- `noreply@ku-market.phumitada.com` or the verified subdomain configured in Resend

This repository is structured as a monorepo with:
- `frontend/` — Next.js web app
- `backend/` — NestJS API server
- `docker-compose.yml` — local Postgres + Redis
- `backend/prisma/` — Prisma schema and migration files

---

## 2. System Overview

```mermaid
flowchart LR
    U[User Browser] --> C[Cloudflare DNS]
    C --> F[Frontend: Next.js\nku-market.phumitada.com]
    F --> B[Backend API: NestJS\napi.ku-market.phumitada.com]
    B --> P[(PostgreSQL)]
    B --> R[(Redis)]
    B --> S[Resend Email API]
    B --> CL[Cloudinary]

    U -->|OTP / reset / notification| S
    B -->|uploads| CL
```

### Runtime responsibilities

- Frontend:
  - Next.js app for marketplace UI
  - consumes the backend API via `NEXT_PUBLIC_API_URL`
  - handles client-side routing, forms, and auth UX

- Backend:
  - NestJS API
  - Prisma ORM against PostgreSQL
  - Redis for OTP/session/cache support
  - Mail sending through Resend
  - Cloudinary for image upload handling

- Data layer:
  - PostgreSQL stores the transactional marketplace domain
  - Redis stores transient auth and validation state

---

## 3. Request Flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant F as Frontend
    participant B as Backend API
    participant P as PostgreSQL
    participant R as Redis
    participant M as Resend

    U->>F: Register / login / reset password
    F->>B: POST /auth/*
    B->>R: Store OTP / temporary auth state
    B->>M: Send email with Resend
    U->>F: Enter OTP
    F->>B: Verify OTP
    B->>P: Persist user / status changes
    B-->>F: JWT / authenticated response
```

Important: the auth flow is designed so the backend owns OTP issuance and validation, while the frontend simply displays the flow to the user.

---

## 4. Deployment Topology

For production on a VPS or Kubernetes cluster, the intended topology is:

```mermaid
flowchart TB
    subgraph Internet
      D[DNS: ku-market.phumitada.com]
    end

    subgraph ReverseProxy
      CF[Cloudflare / ingress / load balancer]
    end

    subgraph AppTier
      FE[Frontend Pod / VPS service]
      BE[Backend API Pod / VPS service]
    end

    subgraph DataTier
      PG[(PostgreSQL)]
      RD[(Redis)]
    end

    D --> CF
    CF --> FE
    FE --> BE
    BE --> PG
    BE --> RD
    BE --> RESEND[Resend]
```

Production examples:
- Frontend DNS: `ku-market.phumitada.com` -> VPS or ingress target
- API DNS: `api.ku-market.phumitada.com` -> backend target
- Email sender: `noreply@ku-market.phumitada.com` (or the verified subdomain approved by Resend)

---

## 5. Local Development Setup

Requirements:
- Node.js 20.x
- npm
- Docker + Docker Compose

From repository root:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
npm ci --prefix backend
npm ci --prefix frontend
docker compose up -d postgres redis
```

Then start each service:

```bash
npm run start:dev --prefix backend
npm run dev --prefix frontend
```

Local defaults:
- Frontend: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: local docker service
- Redis: local docker service

If you change backend port or frontend URL, update:
- `backend/.env` -> `PORT`, `DATABASE_URL`, `REDIS_HOST`, etc.
- `frontend/.env.local` -> `NEXT_PUBLIC_API_URL`

---

## 6. Environment Variables

### Frontend
Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Production example:

```env
NEXT_PUBLIC_API_URL=https://api.ku-market.phumitada.com
```

### Backend
Example values:

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change_this_in_production
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=noreply@ku-market.phumitada.com
```

Important:
- `RESEND_FROM_EMAIL` must match a domain verified in Resend
- `DATABASE_URL` must point to a reachable PostgreSQL instance
- never commit `.env` files to source control

---

## 7. Domain and DNS Configuration

For the production domain `ku-market.phumitada.com`, the recommended DNS target is the frontend VPS or the ingress endpoint.

Example Cloudflare values:

```text
A/AAAA record:
  ku-market.phumitada.com -> VPS public IP

CNAME record:
  api.ku-market.phumitada.com -> backend load balancer / ingress target
```

If using a custom subdomain for email:

```text
A or CNAME:
  ku-market.phumitada.com -> app server
  api.ku-market.phumitada.com -> backend server
```

And in Resend:
- verify the exact sender domain used by the app
- then configure `RESEND_FROM_EMAIL` to a sender belonging to that verified domain

Example valid sender:
- `noreply@ku-market.phumitada.com`

Example invalid sender:
- `onboarding@resend.dev`
- `something@another-domain.com` when that domain is not verified

---

## 8. Email / OTP Configuration

OTP emails are sent through Resend from the backend service. The app intentionally avoids hardcoding the sender to the default Resend domain. Instead it reads configuration at runtime.

The relevant sender logic is environment-driven via:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

The backend checks:
- if `NODE_ENV !== 'production'`, OTP is printed in the app log instead of sending real mail
- if `NODE_ENV === 'production'`, a valid `RESEND_API_KEY` is required

This protects local workflows while enforcing production email configuration.

### Example accepted sender values

```env
RESEND_FROM_EMAIL=noreply@ku-market.phumitada.com
```

### Example rejected sender values

```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

The latter is a Resend sandbox/test address and should not be used for production email delivery.

---

## 9. Data Layer

### PostgreSQL
Used for:
- users
- posts
- offers
- transactions
- giveaways
- reports and appeals
- membership
- appointment cards

Prisma is used as the ORM layer.

```bash
npm run prisma:generate --prefix backend
```

Local migration steps can be run from the repo root when schema updates are needed, but for a clean local development environment the standard Docker workflow is:

```bash
docker compose up -d postgres redis
```

### Redis
Used for:
- OTP tracking
- temporary auth state
- retry/fallback state when needed

---

## 10. Local Database Recovery / Refresh Pattern

If the local database needs to be rebuilt from scripts:

```bash
kubectl exec -i ku-marketplace-postgres-0 -- psql -U postgres -d ku-marketplace-postgres -v ON_ERROR_STOP=1 < init.sql
kubectl exec -i ku-marketplace-postgres-0 -- psql -U postgres -d ku-marketplace-postgres -v ON_ERROR_STOP=1 < backend/prisma/local/before-schema-v3.sql
kubectl exec -i ku-marketplace-postgres-0 -- psql -U postgres -d ku-marketplace-postgres -v ON_ERROR_STOP=1 < backend/prisma/migrations/20261011000000_schema_v3_transaction_split/migration.sql
```

For local Docker-based dev, use the repository root scripts and `docker compose` instead of direct `kubectl` commands.

---

## 11. Verification Commands

Run the relevant checks before production deployment:

```bash
npm test --prefix backend -- --runInBand
npm run build --prefix backend
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

For full e2e validation:

```bash
npm run test:e2e --prefix backend -- --runInBand
```

---

## 12. Troubleshooting Checklist

### Frontend cannot reach API
- confirm `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- verify the backend is listening on the expected port
- ensure CORS is configured correctly in NestJS

### Database connection fails
- confirm `DATABASE_URL` is reachable from the pod/VPS
- confirm PostgreSQL is running and accepting connections
- verify service name / cluster DNS is correct

### Email not arriving
- verify the Resend domain in the dashboard
- ensure sender matches the verified domain exactly
- confirm `RESEND_API_KEY` is present and valid
- check `NODE_ENV` and backend logs

### Domain not resolving
- validate Cloudflare DNS records
- wait for DNS propagation
- verify the A/CNAME points to the correct public target

---

## 13. Production Hardening Notes

- never deploy `.env` files
- use Kubernetes secrets or managed secret storage in production
- rotate `JWT_SECRET`, `RESEND_API_KEY`, and Cloudinary secrets regularly
- keep database, Redis, and app tiers isolated by service boundaries
- prefer HTTPS everywhere and enforce TLS on public routes

---

## 14. Summary

The app is designed around a clean separation of concerns:
- frontend for UX and routing
- backend for business logic and DB access
- PostgreSQL for source-of-truth persistence
- Redis for temporary state
- Resend for transactional email
- Cloudflare for public DNS and edge routing

The production domain should map consistently to the app entry points, and the Resend sender address must match the verified domain exactly; otherwise, email delivery will fail even though the domain shows as verified in the dashboard.
