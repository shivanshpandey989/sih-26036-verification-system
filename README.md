# Online Verification System for Weighing & Measuring Instruments

Smart India Hackathon 2026 — Problem Statement **26036**
*Development of an Online Verification System for Weighing and Measuring Instruments*

A full-stack, working prototype for the Department of Legal Metrology: officers
digitize instrument verification, every observation is saved to PostgreSQL as
it's typed, results are computed automatically, and a certificate with a
scannable QR code is generated the moment a verification passes.

---

## 1. Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 + TypeScript + Tailwind CSS + Vite + Recharts |
| Backend   | Node.js + Express.js (REST API) |
| Database  | PostgreSQL |
| ORM       | Prisma |
| Auth      | JWT + role-based access control |
| QR codes  | `qrcode` npm package |
| PDF       | `pdfkit` |
| Scheduling| `node-cron` (expiry checks) |

## 2. Project structure

```
sih-project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Full relational schema
│   │   └── seed.js            # Demo data (users, instruments, verifications, certs)
│   ├── src/
│   │   ├── routes/            # auth, instruments, verifications, observations,
│   │   │                        certificates, verify (public), dashboard,
│   │   │                        auditLogs, users, businesses
│   │   ├── middleware/        # JWT auth, RBAC, error handler
│   │   ├── utils/             # prisma client, jwt, qr, pdf, tolerance rule engine, audit
│   │   ├── jobs/               # expiry-check cron job
│   │   └── index.js            # app entry point
│   ├── storage/certificates/   # generated certificate PDFs land here
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.ts       # axios instance, attaches JWT, handles 401
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── components/         # Sidebar, Header, AppLayout, StatusBadge, ProtectedRoute
│   │   └── pages/               # Login, Dashboard, Instruments, InstrumentDetail,
│   │                              VerificationForm, CertificateView, VerifyPublic,
│   │                              AuditLogs, Users
│   ├── .env.example
│   └── package.json
└── README.md   (this file)
```

## 3. Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)
- npm

## 4. Setup — Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL to your local Postgres connection string,
# and set JWT_SECRET to any long random string.

npm install
npx prisma generate
npx prisma migrate dev --name init   # creates all tables
npm run seed                         # populates demo data (see §8)

npm run dev                          # starts the API on http://localhost:5000
```

`npm run setup` runs all of the above (`install` → `generate` → `migrate` →
`seed`) in one command, once `.env` is filled in.

To create the database itself first, if it doesn't exist yet:

```bash
createdb ovs_db
# or: psql -U postgres -c "CREATE DATABASE ovs_db;"
```

## 5. Setup — Frontend

```bash
cd frontend
cp .env.example .env   # defaults to http://localhost:5000/api, adjust if needed
npm install
npm run dev             # starts the app on http://localhost:5173
```

Open `http://localhost:5173` and sign in with one of the demo accounts below.

## 6. Demo accounts

Seeded by `npm run seed`. Password is the same for all: **`Demo@1234`**

| Role     | Email              |
|----------|--------------------|
| Admin    | admin@demo.com     |
| LMO      | lmo@demo.com       |
| GATC     | gatc@demo.com      |
| Business | business@demo.com  |

## 7. Demo flow (what to show the judges)

1. Sign in as **LMO** (`lmo@demo.com`).
2. Open **Instruments**, click into any instrument, click **Start Verification**.
3. Type a value into the first observation field (e.g. *Zero Error* → `0.02`).
   After ~700ms it shows **✓ Saved** — that write just hit PostgreSQL.
4. Fill in the remaining four parameters the same way.
5. **Refresh the browser tab.** The verification page reloads from the API
   and every value you entered is still there — it was never in
   `localStorage`, it came back from the database.
6. Click **Complete Verification**. The backend recomputes PASS/FAIL from the
   tolerance rules, and (if PASS) creates a `Certificate` row, generates a
   real QR token, and renders an actual PDF to disk.
7. Click **View Certificate & QR**. Download the PDF (it's a real file, not
   a placeholder) and note the QR code.
8. Open the QR's URL — `http://localhost:5173/verify/<token>` — in a new
   private/incognito tab (no login). It shows **Certificate Verified** with
   the instrument, owner and validity details, pulled live from the public
   `GET /api/verify/:token` endpoint.
9. Go back to **Dashboard** to show the stat cards, monthly chart, and
   pass/fail breakdown updating with the new verification.
10. Sign in as **Admin** to show **Audit Logs** (every action above is
    recorded there) and **Users**.

## 8. What the seed script creates

- 1 Admin, 1 LMO, 1 GATC, 1 Business user (plus 4 more businesses without
  logins, to look realistic)
- 10 instruments across 8 instrument types
- 15 verification records: a mix of `PASS`, `FAIL`, and still-`PENDING`
  (in-progress) verifications, with individually-scored observations
- Certificates (with working QR tokens) for the passed verifications, and
  real PDF files generated for the first five of them so "Download PDF"
  works immediately without you having to complete a verification first

## 9. How automatic observation saving works

Each observation row in the verification form is an independent React
component with its own local save state. On every keystroke:

```
keystroke
  → local state updates immediately (fields never feel laggy)
  → a 700ms debounce timer (re)starts
  → after 700ms of no further typing:
      PUT /api/observations/:id  { observationValue, remarks }
  → backend re-evaluates PASS/FAIL for that row against the tolerance
    rules in src/utils/tolerance.js, and writes the row to PostgreSQL
    in the same request (enteredAt = now())
  → response returns { success, savedAt, observation }
  → UI switches to "✓ Saved at HH:MM"
```

If the request fails, the row shows **⚠ Not saved — Retry**; clicking Retry
re-sends the exact same payload. Because every field is its own database
row (`Observation`), closing the browser and reopening the verification
(`GET /api/verifications/:id`) simply re-reads whatever was last written —
there is no client-side cache of the answers, so there is nothing to lose.

Row order is kept stable with an explicit `sortOrder` column (not by
`createdAt`/`enteredAt` alone) — several observation rows are created in the
same database transaction when a verification starts, so relying on
timestamps to order them is not reliable in Postgres, which resolves
`now()` once per transaction, not once per row.

## 10. How QR verification works

1. On `POST /api/verifications/:id/complete`, if the result is `PASS`, the
   backend generates a random 32-character `qrToken` (`crypto.randomBytes`)
   and creates a `Certificate` row keyed by it. **No instrument or business
   data is embedded in the QR** — only an opaque token.
2. The QR image itself encodes `FRONTEND_URL/verify/:qrToken`
   (`src/utils/qr.js`), and is both embedded in the generated PDF and
   available on demand at `GET /api/certificates/:id/qr` (PNG, requires login,
   used by the officer's certificate view screen).
3. Anyone who scans the code lands on `/verify/:token` in the frontend,
   which calls the **public, unauthenticated** `GET /api/verify/:token`.
   That endpoint is rate-limited (30 requests/minute/IP) to deter token
   scraping, looks the certificate up by its token, and returns the
   instrument/owner/authority details plus a live-computed status:
   - Token not found → `INVALID CERTIFICATE`
   - Found but past `validUntil` → `CERTIFICATE EXPIRED` (and the row is
     flipped to `EXPIRED` in the database so later dashboard/report queries
     stay consistent)
   - Otherwise → `Certificate Verified`, `VALID`

## 11. Pass / Fail rule engine

`backend/src/utils/tolerance.js` holds a `parameterRules` map keyed by
observation parameter name. Each observation is evaluated the moment it's
autosaved:

- If the observation row has explicit `minValue`/`maxValue` set, those win.
- Otherwise the named rule's `tolerance` (or `min`/`max`, or a custom
  `evaluate` function) is applied against the expected value.
- The **numeric limits shipped here are placeholders for demo purposes** —
  they are deliberately structured so the applicable Legal Metrology
  tolerance tables can be substituted per instrument type / accuracy class
  without touching any route or UI code.

The overall verification result (`computeOverallResult`) is `FAIL` if any
observation failed, `PASS` if every observation passed, and otherwise
`PENDING` — which is what blocks `POST /api/verifications/:id/complete`
until every row has a value.

## 12. API summary

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/instruments
POST   /api/instruments
GET    /api/instruments/:id
PUT    /api/instruments/:id

POST   /api/verifications                          { instrumentId }
GET    /api/verifications/:id
PUT    /api/verifications/:id                       { remarks, status }
POST   /api/verifications/:id/complete              { remarks }
GET    /api/verifications/:id/certificate

POST   /api/verifications/:verificationId/observations
PUT    /api/observations/:id                        { observationValue, remarks }
DELETE /api/observations/:id

GET    /api/certificates/:id
GET    /api/certificates/:id/qr                     (PNG)
GET    /api/certificates/:id/pdf                    (file download)

GET    /api/verify/:token                            (PUBLIC, no auth, rate-limited)

GET    /api/dashboard/stats
GET    /api/audit-logs                                (admin only)
GET    /api/users                                     (admin only)
POST   /api/users                                     (admin only)
GET    /api/businesses
POST   /api/businesses
```

## 13. Roles & access control

| Role     | Can do |
|----------|--------|
| ADMIN    | Everything: manage users, view all instruments/verifications, audit logs, dashboards |
| LMO      | View assigned instruments, start/enter/complete verifications, generate certificates |
| GATC     | Same verification permissions as LMO |
| BUSINESS | View/apply for their own instruments, view status, download their certificates |
| Public   | No login — can only hit `GET /api/verify/:token` |

Enforced in `src/middleware/auth.js` (`authenticate` verifies the JWT,
`authorize(...roles)` gates specific routes) and, for instrument visibility,
by filtering `Instrument` queries to the caller's `Business` when the role
is `BUSINESS`.

## 14. Expiry alerts

`src/jobs/expiryCheck.js` runs once at server boot and daily at 02:00
(`node-cron`). It flips instruments to `EXPIRING_SOON` once their next
verification date falls inside `EXPIRY_ALERT_DAYS` (default 30, configurable
in `.env`), flips them (and their certificate) to `EXPIRED` once the date
has passed, and writes a `Notification` row for the owning business's user
account in each case.

## 15. Security notes

- Passwords are hashed with bcrypt; nothing password-related is ever
  returned from any endpoint.
- All write endpoints are behind JWT auth + role checks; the only
  unauthenticated route is the public QR verification lookup, which is
  rate-limited.
- All database access goes through Prisma (parameterized queries — no raw
  SQL, no injection surface).
- **Known simplification for the hackathon build:** certificate read
  endpoints (`GET /api/certificates/:id`, `/pdf`, `/qr`) check that the
  requester is logged in, but don't yet check that a `BUSINESS` user owns
  that specific certificate. For a production deployment this should be
  tightened to an ownership check, the same way instrument listing already
  is.

## 16. Troubleshooting

- **`P1001: Can't reach database server`** — Postgres isn't running, or
  `DATABASE_URL` in `backend/.env` is wrong. Confirm with
  `psql -U postgres -c "\l"` and that the port/host match.
- **`relation "User" does not exist`** — migrations haven't run yet:
  `cd backend && npx prisma migrate dev --name init`.
- **Seed runs but login fails** — the seed script wipes and re-inserts all
  users every time (`npm run seed` is idempotent), so re-run it if accounts
  seem missing; password is always `Demo@1234`.
- **Frontend shows "Could not load…" everywhere** — check the backend is
  actually running on the port in `frontend/.env`'s `VITE_API_URL`
  (`http://localhost:5000/api` by default), and that CORS isn't blocked by
  a mismatched port.
- **QR / PDF download 404s** — the certificate only has a PDF once a
  verification has actually been completed with a `PASS` result (or for the
  first five seeded certificates, which are pre-generated). A `FAIL`
  verification never gets a certificate — that's correct behavior, not a bug.
- **"All observations must be entered" blocks completion** — every
  observation row must have a non-empty value (status must not be
  `PENDING`) before `POST /api/verifications/:id/complete` will succeed;
  this is enforced deliberately so results can't be computed on partial data.
- **`npm run build` (frontend) fails on type errors** — run `npm install`
  first; before dependencies are installed, `tsc` cannot resolve
  `react`/`axios`/`react-router-dom` types and reports cascading errors that
  disappear once `node_modules` exists.

## 17. Known limitations of this prototype

- Certificate read endpoints don't yet enforce per-business ownership (see
  §15 security note) — fine for a demo where everyone in the room is a
  trusted evaluator, worth tightening before any real deployment.
- The tolerance/rule engine (§11) ships placeholder numeric limits, not the
  applicable Legal Metrology tables — intentionally, so the real limits can
  be dropped in without touching route or UI code.
- There's a working API for adding ad-hoc extra observation parameters
  beyond the default five (`POST /api/verifications/:verificationId/observations`),
  but no frontend UI wired to it yet — the default 5-parameter form covers
  the full demo flow in §7.
- No automated test suite (unit/integration) is included; verification here
  was static analysis plus a manual trace, described in §18 below.

## 18. What I verified before handing this over, and what I couldn't

This was built and reviewed in a sandboxed environment with **no outbound
network access**, so I could not run `npm install`, connect to a real
PostgreSQL instance, or boot the servers here. What I *did* do:

- Syntax-checked every backend file (`node --check`) — all pass.
- Ran `tsc --noEmit` against the frontend; the only errors reported are
  "cannot find module" / implicit-`any` noise from the absent
  `node_modules` (expected with no `npm install`), nothing else.
- Traced the full request path by hand for autosave → PostgreSQL write →
  pass/fail evaluation → verification completion → certificate/QR/PDF
  generation → public verification lookup, and fixed two real issues found
  this way:
  1. Observations were originally ordered by a timestamp that changes on
     every edit, which would have made table rows visibly reorder while
     typing — replaced with an explicit `sortOrder` column.
  2. The initial fix (ordering by `createdAt`) would itself have silently
     failed for the default 5 parameters, because they're inserted in a
     single Postgres transaction where `now()` is constant across every
     statement — this is why `sortOrder` is a plain integer, not another
     timestamp.
- Cross-checked every frontend API call against the backend route table by
  hand — all match.

**Please run the actual `npm run setup` → `npm run dev` → click through
§7 yourself** once you have Postgres available; that live pass is the one
thing I genuinely cannot substitute for from here, and it's worth doing
before your SIH demo regardless of who built it.
