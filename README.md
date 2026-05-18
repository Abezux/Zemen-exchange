<div align="center">
  <h1>Zemenex</h1>
  <p><strong>Secure, escrow-backed USDT P2P exchange for merchants and traders.</strong></p>
  <p>
    <img alt="Version" src="https://img.shields.io/badge/version-v1.1-blue?style=flat-square" />
    <img alt="Status" src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" />
    <img alt="Stack" src="https://img.shields.io/badge/stack-React_%2B_Express_%2B_Prisma-success?style=flat-square" />
    <img alt="Database" src="https://img.shields.io/badge/database-PostgreSQL-informational?style=flat-square" />
  </p>
</div>

---

TL;DR — This repository is a full‑stack prototype of Zemenex, a merchant‑backed P2P USDT ↔ ETB exchange with escrow, admin controls, and manual deposit/withdrawal workflows. The codebase contains a Vite/React frontend, an Express + TypeScript backend, and Prisma models targeting a PostgreSQL (Neon) database.

-----

Contents
- Hero & links
- Overview
- Core features
- Architecture & flow
- Project structure
- Database (Prisma) models & relationships
- Environment variables
- Local development
- Deployment
- API overview
- Security & reliability notes
- Known limitations / TODOs
- Contribution
- License
- Footer

-----

**Hero & Links**

- Name: Zemenex
- Tagline: Secure, escrow-backed USDT P2P exchange for merchants and traders
- Version: v1.1
- Status: Active / ready for deployment
- Official Website: https://zemenex.app 
- Instagram: https://www.instagram.com/zemenexchange
- Facebook: <a href="https://web.facebook.com/profile.php?id=61589670447478&ref=PROFILE_EDIT_xav_ig_profile_page_web#">zemenex</a>


-----

**Overview**

Zemenex is a fintech-focused P2P marketplace that enables direct USDT trading against ETB using merchant liquidity. The platform provides:

- Merchant onboarding and approval
- BUY / SELL marketplace ads with liquidity management
- Escrow-backed order lifecycle (lock → paid → release) to protect buyer and seller funds
- Manual deposit proof submission and admin verification
- Withdrawal requests with administrative settlement
- Audit logging and an admin control console

Target users: individual traders, local merchants providing liquidity, and platform administrators operating settlements and dispute resolution.

-----

**Core features (implemented in code)**

- P2P trading marketplace (ads, orders, atomic escrow handling)
- Merchant application & approval workflow
- Deposit submission with txHash + image proof (Cloudinary)
- Withdrawal request creation and admin settlement
- Wallet model with `balance` and `lockedBalance` to separate available funds and escrow
- Google Sign-In (OIDC idToken validation) + JWT session cookie
- Admin console for deposit verification, withdrawals payout, merchant moderation, order resolution, and audit logs
- Idempotent order creation via `idempotencyKey` on `P2POrder`
- Prisma ORM with transactional operations for critical flows

-----

**Architecture**

- Frontend: React (Vite) + Tailwind, client-side routing, Zustand for auth state, axios configured with `withCredentials` to send the HttpOnly JWT cookie.
- Backend: Node.js + Express (TypeScript via TSX), modular `backend/routes/*` handlers, middleware for authentication and admin guards.
- ORM: Prisma (PostgreSQL provider) with generated client used across backend routes.
- Database: PostgreSQL-compatible (Neon recommended) — migrations tracked in `prisma/migrations`.
- File storage: Cloudinary for proof images (deposit and payment proof uploads).
- Auth: Google identity tokens verified server-side via `google-auth-library`; server issues a JWT set as an HttpOnly cookie.
- Deployment targets: Frontend (Vercel), Backend (Render or equivalent), Database (Neon / managed PostgreSQL).

High-level request flow examples:

- Sign-in: Client obtains Google idToken → POST /api/auth/google → server verifies idToken, creates User + Wallet if missing, issues JWT cookie.
- Deposit: User submits txHash + proof image → POST /api/deposit/submit (creates DepositRequest pending) → Admin verifies via POST /api/admin/deposits/:id/verify → wallet credited inside a Prisma transaction.
- P2P SELL ad: Merchant creates ad → server atomically decrements `wallet.balance` and increments `wallet.lockedBalance` while creating `P2PAd`.
- Order: User places order referencing an ad → server checks liquidity and order limits, then locks funds (depending on ad type), decrements `P2PAd.remainingAmount` and creates `P2POrder` (idempotency supported).
- Release: Seller releases funds → server moves `lockedBalance` → `balance` of payee inside a transaction and marks order `COMPLETED`.

-----

**Project structure **

Root layout :

```
. 
├── backend/              # Express routes and backend helpers
│   ├── lib/              # Prisma client, Cloudinary wrapper
│   ├── middleware/       # authenticate, authorizeAdmin, checkNotFrozen
│   └── routes/           # auth, user, deposit, withdraw, admin, p2p, transaction
├── frontend/             # Vite React app (UI, components, pages)
├── prisma/               # schema.prisma, migrations/
├── server.ts             # backend entrypoint (mounts routes)
├── package.json          # backend dependencies & scripts
└── frontend/vercel.json  # frontend rewrite config (for Vercel)
```

Key files to review:

- backend/routes/auth.ts — Google login, JWT issuance
- backend/routes/p2p.ts — Merchant application, ads, order lifecycle, escrow logic
- backend/routes/admin.ts — Deposit verification, withdrawal settlement, order resolution, merchant moderation
- backend/middleware/auth.ts — Cookie/header JWT parsing, `authorizeAdmin`, `checkNotFrozen`
- prisma/schema.prisma — canonical database model definitions
- frontend/src/pages/* — LoginPage, P2PPage, AdminPage, DepositPage, WithdrawPage
- frontend/src/store/authStore.ts — auth state and `checkAuth()` (GET /api/user/me)

-----

**Database Design (Prisma)**

Main models (as defined in `prisma/schema.prisma`):

- `User` — primary account record with `email` (unique), `name`, `role` (USER|ADMIN), `isFrozen` flag. One-to-one with `Wallet` and optional `Merchant`.
- `Wallet` — `userId` (unique FK), `balance` (available USDT), `lockedBalance` (USDT in escrow / reserved for SELL ads), `currency` default `USDT`.
- `Merchant` — `userId` (unique FK), `businessName`, `phoneNumber`, `bio`, `status` (PENDING|APPROVED|REJECTED|SUSPENDED). Merchants publish `P2PAd` records.
- `P2PAd` — `merchantId`, `type` (BUY|SELL), `amount` (original), `remainingAmount`, `minLimit`, `maxLimit`, `price` (ETB/USDT), `status`.
- `P2POrder` — `adId`, `creatorId` (user responding), `merchantId`, `type`, `amountUsdt`, `amountEtb`, `status` (PENDING|PAID|COMPLETED|CANCELLED|DISPUTED), `paymentProof`, `idempotencyKey` (unique).
- `DepositRequest` — `userId`, `amount`, `network`, `txHash` (unique), `proofImageUrl`, `status` (pending/verified/rejected), `verifiedAt`.
- `WithdrawalRequest` — `userId`, `amount`, `fee`, `walletAddress`, `network`, `status` (pending/paid/rejected), `processedAt`.
- `Transaction` — ledger entries for deposits/withdrawals with `referenceId` linking to the original request.
- `AuditLog` — lightweight immutable action logs (userId optional, action string, JSON `details`).
- `GlobalSetting` — singleton (`id = "singleton"`) storing `buyRate` and `sellRate` used for admin-controlled pricing.

Relationships summary:

- `User 1 — 1 Wallet`
- `User 1 — 1 Merchant` (optional)
- `Merchant 1 — * P2PAd`
- `P2PAd 1 — * P2POrder`
- `P2POrder` references both the merchant and the creator user
- `DepositRequest` and `WithdrawalRequest` link back to `User` and create `Transaction` records on processing

Constraints and transactional guarantees:

- Critical balance / escrow operations use `prisma.$transaction(...)` to atomically update wallet balances, p2p ad liquidity, and order states.
- `txHash` and `idempotencyKey` are unique to protect against double‑submits.

-----

**Environment variables**

Backend `.env` (root)

```env
# Server
PORT=3000
NODE_ENV=development

# Authentication
GOOGLE_CLIENT_ID
JWT_SECRET

# Database (Neon/Postgres)
DATABASE_URL=postgresql://...           # required for Prisma client
DIRECT_URL=postgresql://...             # optional -- used by Prisma

# Frontend / CORS
FRONTEND_URL=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Frontend `.env` (frontend/.env)

```env
VITE_GOOGLE_CLIENT_ID
VITE_API_URL=http://localhost:3000   # optional — axios falls back to relative paths
```

-----

**Local development**

Prerequisites

- Node.js 18+ (recommended)
- pnpm / npm
- A running Postgres instance or Neon project, and Prisma CLI

Backend

```bash
# from repository root
npm install
# generate Prisma client
npx prisma generate
# create / apply local migration and seed (if any)
npx prisma migrate dev --name init

# run server in development
npm run dev
```

Frontend

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

Notes
- The frontend uses `axios.defaults.withCredentials = true` and expects the backend to set an HttpOnly cookie on sign-in.
- If using separate hosts in development, set `FRONTEND_URL` and `VITE_API_URL` appropriately and allow CORS.

-----

**Deployment**

Typical production setup used by the project:

- Frontend: Vercel (deploy `frontend/` build). `frontend/vercel.json` contains a simple rewrite.
- Backend: Render / any Node host supporting Express. Configure environment variables (DB, Google client, JWT_SECRET, Cloudinary) in the host's secret store.
- Database: Neon (managed Postgres) or any PostgreSQL instance. Set `DATABASE_URL` and `DIRECT_URL` in production.

Migration workflow (production):

```bash
# Build and deploy backend container/environment
npx prisma migrate deploy   # apply migrations in production
npx prisma generate         # generate client for the deployed schema
```

Operational notes

- Enable `NODE_ENV=production` and set `trust proxy` if using a proxy/load balancer (Render requires this for secure cookies).
- Ensure HTTPS is enabled; the server sets cookies with `secure: true` and `sameSite: 'none'`.

-----

**API overview**

Authentication

- `POST /api/auth/google` — accept Google idToken (`credential`) and issue JWT cookie; creates `User` + `Wallet` if missing.
- `POST /api/auth/logout` — clear session cookie.

User

- `GET /api/user/me` — returns current `User` with `wallet`, `merchant` and `settings` (global rates).

Deposit

- `POST /api/deposit/submit` — body/form: `txHash`, `amount`, `network`, file field `proof`; creates a `DepositRequest` with `status = pending`.
- `GET /api/deposit/history` — user deposit history.

Withdrawal

- `POST /api/withdraw/usdt` — create a `WithdrawalRequest` (pending). Admin later marks paid.
- `GET /api/withdraw/history` — user withdrawal history.

Transactions

- `GET /api/transactions/transactions` — user transaction feed (note: route mounted as `/api/transactions` with an internal `/transactions` path).

P2P Marketplace

- `POST /api/p2p/merchant/apply` — submit merchant application (creates or updates a `Merchant` entry with `PENDING`).
- `GET /api/p2p/ads` — list active ads (marketplace)
- `GET /api/p2p/my-ads` — merchant-specific ads
- `POST /api/p2p/ads` — create ad (SELL ads atomically lock merchant funds)
- `PUT /api/p2p/ads/:id` — edit ad (amount edits may adjust locked funds)
- `DELETE /api/p2p/ads/:id` — delete ad and refund locked funds if applicable
- `POST /api/p2p/orders` — create order (supports `idempotencyKey` to avoid duplicates)
- `GET /api/p2p/orders` — list participatory orders for user/merchant
- `POST /api/p2p/orders/:id/paid` — buyer confirms payment and optionally uploads proof
- `POST /api/p2p/orders/:id/release` — seller or admin releases escrow to payee
- `POST /api/p2p/orders/:id/cancel` — cancel order (refunds and ad recovery as appropriate)
- `POST /api/p2p/orders/:id/dispute` — open dispute (moves order to `DISPUTED`)

Admin

- `GET /api/admin/deposits` — list deposit requests
- `POST /api/admin/deposits/:id/verify` — verify deposit, credit wallet (atomic)
- `POST /api/admin/deposits/:id/reject` — reject
- `GET /api/admin/withdrawals` — list withdrawals
- `POST /api/admin/withdrawals/:id/pay` — mark withdrawal as paid and debit wallet (atomic)
- `POST /api/admin/withdrawals/:id/reject` — reject
- `GET /api/admin/users` — list users and balances
- `POST /api/admin/users/:id/freeze` — freeze/unfreeze account
- `GET /api/admin/orders` — list all P2P orders
- `POST /api/admin/orders/:id/resolve` — admin resolve (RELEASE | CANCEL) with atomic wallet adjustments
- `GET /api/admin/merchants` — list merchant applications
- `POST /api/admin/merchants/:id/approve` — set merchant status
- `GET /api/admin/logs` — audit logs
- `POST /api/admin/settings` — update global `buyRate` / `sellRate`

-----

**Security & Reliability**

- Authentication: `google-auth-library` verifies the Google idToken server-side; backend issues a JWT stored as an HttpOnly cookie. The middleware `authenticate` validates the JWT from cookie or `Authorization` header.
- Admin guard: `authorizeAdmin` checks `req.user.role === 'ADMIN'` and also allows a hardcoded admin email (present in code). This hardcoded email is a security & operational smell and should be removed or replaced by a proper role management / admin table.
- Escrow & wallet isolation: The `Wallet` model separates `balance` and `lockedBalance`. P2P SELL ads and certain order flows move funds into `lockedBalance` and operations modify balances using `prisma.$transaction(...)` for atomicity.
- Idempotency: `P2POrder.idempotencyKey` is unique which helps protect against duplicate order submissions.
- File uploads: deposit & payment proofs are uploaded to Cloudinary; signed creds must be protected.
- Frozen accounts: `checkNotFrozen` middleware prevents frozen users from trading.

-----

**Known limitations & current inconsistencies **

- Manual deposit verification: Deposits rely on admin verification of user-submitted `txHash` and proof. There is no on‑chain verification or automated reconciliation implemented.
- Withdrawal settlement is manual: `WithdrawalRequest` is created by user but only debited from the wallet when an admin calls the `pay` endpoint.
- No KYC/AML flows implemented 
- No automated tests or CI included in the repository.

-----

**Contribution**

Suggested workflow:

1. Fork the repository and create a feature branch
2. Run the backend and frontend locally
3. Add tests and update Prisma migrations if the schema changes
4. Open a PR with a clear description and migration notes


- Prisma schema lives in `prisma/schema.prisma` — update, run `npx prisma migrate dev` locally, and include the migration when opening a PR.
- Keep secrets out of PRs; use a `.env.example` to show required variables.

-----

**License**

This repository currently does not include a license file.

-----

**Footer**

Zemenex — secure P2P trading primitives with merchant liquidity and admin controls. Use this repository as a foundation for a production rollout; the code contains the core escrow and transactional patterns but requires additional operational hardening (KYC, automated on‑chain reconciliation, role management, monitoring) before public launch.

---

