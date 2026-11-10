# MY CS MTP

An independent, production-ready online test-series platform for Company Secretary (CS) students in India preparing for ICSI exams: **CSEET**, **CS Executive** and **CS Professional**.

Students buy plan-subjects, download question papers, write tests by hand, upload scanned answer sheets, and get human-evaluated copies with marks and remarks from examiners. Includes a complete admin panel, examiner area, secure file storage, Razorpay/Cashfree checkout, referral + wallet system, blog, custom pages and full SEO.

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript — public pages are server-rendered / ISR
- **Styling**: Tailwind CSS 4 + shadcn/ui (default black & white / slate theme)
- **Database**: Prisma ORM — SQLite in development, PostgreSQL in production (same schema, change `datasource provider` only)
- **Auth**: JWT (Bearer token + httpOnly cookie), bcrypt password hashing, email OTP 2FA with verification links, roles: STUDENT / ADMIN / EXAMINER
- **Payments**: Razorpay & Cashfree (one active at a time, chosen in Admin → Payment Gateway) + built-in MOCK gateway for testing
- **Storage**: Cloudflare R2 via the S3-compatible API (`@aws-sdk/client-s3`), with a local-disk fallback when R2 is not configured (dev)
- **Email**: nodemailer (SMTP) — falls back to logging OTPs/links to the app log when SMTP is not configured

## Setup

```bash
# 1. Install dependencies
npm install            # or: bun install

# 2. Configure environment
cp .env.example .env   # then edit values (JWT_SECRET, DATABASE_URL, etc.)

# 3. Create the database schema
npx prisma migrate dev     # or: npm run db:push

# 4. Seed starting content (site settings, courses/plans/subjects, legal pages, blog posts, admin account)
npx prisma db seed         # or: npm run db:seed

# 5. Run in development
npm run dev                # http://localhost:3000

# 6. Production build
npm run build
npm start
```

## Seeded admin account

Created by the seed script from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults):

| Role  | Email                | Password   |
| ----- | -------------------- | ---------- |
| ADMIN | admin@mycsmtp.com    | Admin@1234 |

> Change the admin password from **Admin → Settings → Change admin password** after the first login.

Sample data seeded: 3 courses, 8 plans with plan-subject prices, subjects, test papers (with sample PDF files), schedules, notes, free resources, blog posts, custom pages (About, Privacy, Terms, Refund, Contact) and one sample student (`student-test@mycsmtp.com` / `Student@123`) and examiner (`examiner-test@mycsmtp.com`) for trying the flows. Everything is editable/deletable from the admin panel.

## Scripts

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Start dev server on port 3000              |
| `npm run build`     | Production build (standalone output)       |
| `npm start`         | Run the production build                   |
| `npm run lint`      | ESLint                                     |
| `npm run db:push`   | Push schema to the database                |
| `npm run db:migrate`| Create/apply a migration                   |
| `npm run db:seed`   | Seed the database                          |
| `npm run db:reset`  | Reset the database                         |

## Key URLs

| Area              | Path                                   |
| ----------------- | -------------------------------------- |
| Home              | `/`                                    |
| Pricing           | `/pricing`                             |
| Landing pages     | `/cs-test-series`, `/cseet-test-series`, `/cs-executive-test-series`, `/cs-professional-test-series`, `/cs-test-series-review` |
| Schedules         | `/cstestseriesschedule`                |
| Blog              | `/blog`, `/blog/[slug]`, `/blog/tag/[tag]` |
| Custom pages      | `/{slug}` (e.g. `/about-us`)           |
| Cart / checkout   | `/cart`, `/payment-success`, `/payment-failed` |
| Student dashboard | `/dashboard` (+ test-series, notes, performance, wallet, invoice, …) |
| Examiner area     | `/examiner`                            |
| Admin panel       | `/admin`                               |
| SEO files         | `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms.txt`, `/opensearch.xml`, `/manifest.webmanifest` |

## File storage

- Objects live in R2 (S3 API); only object **keys** are stored in the database.
- Private files (question papers, answer sheets, notes, evaluated copies) are served through authenticated, entitlement-checked server routes that issue short-lived signed GET URLs.
- Public files (blog images, site logo/OG, public free resources) use `S3_PUBLIC_BASE_URL`.
- When R2 env vars are absent (development), uploads fall back to `public/uploads` on local disk with the same access rules.

## Payments

- The active gateway (RAZORPAY / CASHFREE / MOCK) and sandbox/production mode are chosen in **Admin → Payment Gateway**; gateway secrets come **only** from environment variables and are never exposed to the client.
- Totals are recalculated server-side from current prices, promo and wallet rules before every order.
- Access (Purchase rows) is granted only after server-side signature/status verification succeeds.

## Security

- Every API route verifies the JWT and the exact role (STUDENT / EXAMINER / ADMIN) server-side.
- Ownership + entitlement checks on every download; private files never have permanent public URLs.
- Rate limiting on login/OTP, OTP expiry + attempt limits, single-use verification tokens (only hashes stored).
- Destructive admin actions (revoke purchases, delete) require confirmation; purchase revocation additionally requires the admin's password and runs as a tracked job the admin can poll.
- Security headers (HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, CSP allowing Razorpay/Cashfree domains) applied in middleware; private areas send `X-Robots-Tag: noindex, nofollow`.

## SEO

- SSR/ISR on all public pages; unique titles/descriptions, canonical URLs, Open Graph + Twitter cards with a default OG image.
- JSON-LD: Organization, WebSite + SearchAction, FAQPage, Course + Offer, BreadcrumbList, BlogPosting, Reviews.
- Dynamic `sitemap.xml`, `robots.txt`, RSS feed (`/feed.xml`), `llms.txt`, `opensearch.xml`, web manifest.
- 301 redirects recorded when a blog post / custom page / course / plan slug changes in admin.
