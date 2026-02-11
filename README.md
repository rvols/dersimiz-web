# Dersimiz – Web & API

Mobile-first tutoring platform: **landing site**, **admin panel**, and **backend API** for the Dersimiz mobile apps.

## Repo structure

- **`/api`** – Node.js (Express) backend: auth, profiles, admin, subscriptions, support, onboarding data.
- **`/web`** – Next.js 14 (App Router): public landing (TR/EN) and admin dashboard.
- **`/what-is-dersimiz.md`** – Product and technical spec.
- **`/design-system.md`** – Brand and UI guidelines.

## Quick start (local)

**Infrastructure (per [what-is-dersimiz.md](what-is-dersimiz.md)):** PostgreSQL 15+ and Redis 7 (caching/session). For local dev you can run PostgreSQL and Redis via Docker or install locally.

### 1. Database & Redis

- **PostgreSQL 15+** required. Create a database and user:

```bash
createdb dersimiz
# create user dersimiz with password 'password';
```

- **Redis 7** required (session and API caching). Run locally or in Docker: `docker run -d -p 6379:6379 redis:7-alpine redis-server --appendonly yes`

### 2. Backend

```bash
cd api
cp .env.example .env
# Edit .env: set DATABASE_URL, REDIS_URL, JWT_SECRET, ADMIN_JWT_SECRET
npm install
npm run migrate   # applies schema from src/db/schema.sql
npm run seed       # creates default admin + plans/boosters/lesson types
npm run dev        # http://localhost:3000
```

**Default admin (after seed):**  
- Email: `admin@dersimiz.com`  
- Password: `Admin123!`  
Override with env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

### 3. Web

```bash
cd web
cp .env.example .env
# Set NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev        # http://localhost:3001
```

- **Landing:** http://localhost:3001 (i18n: language from browser or in-page TR/EN switcher)  
- **Admin:** http://localhost:3001/admin → login with the seeded admin.

## Docker

Per the architecture in [what-is-dersimiz.md](what-is-dersimiz.md), Docker Compose runs **API**, **PostgreSQL**, **Redis**, and **Web**:

```bash
# From repo root
docker-compose up -d
# API: http://localhost:3000
# Web: http://localhost:3001
# Run seed inside api container once: docker-compose exec api npm run seed
```

- **PostgreSQL** (port 5432) – main database; schema applied via `docker-entrypoint-initdb.d`.
- **Redis** (port 6379) – session and API caching.
- After first start, run seed to create admin and default content.

## API overview

### Mobile / app routes (Bearer token unless noted)

- **Auth (phone):** `POST /api/v1/auth/request-otp`, `POST /api/v1/auth/verify-otp`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
- **Profile:** `GET /api/v1/profile`, `PUT /api/v1/profile`, `POST /api/v1/profile/avatar`, `DELETE /api/v1/profile`, `GET /api/v1/profile/completeness` (tutor)
- **Onboarding:** `GET /api/v1/onboarding/status`, `POST /api/v1/onboarding/step`, `GET /api/v1/onboarding/data` (public)
- **Tutor (role=tutor):** `GET /api/v1/tutor/dashboard`, `GET /api/v1/tutor/lessons`, `GET /api/v1/tutor/lessons/:id`, `POST/PUT/DELETE /api/v1/tutor/lessons(/:id)`, `GET/PUT /api/v1/tutor/availability`, `GET /api/v1/tutor/students`, `GET/POST /api/v1/tutor/subscription`, `GET/POST /api/v1/tutor/boosters`
- **Student:** `GET /api/v1/student/dashboard`, `POST /api/v1/student/search`, `GET /api/v1/student/search/history`, `GET /api/v1/student/tutors`, `POST/DELETE /api/v1/student/favorites/:tutorId`
- **Chat:** `POST /api/v1/chat/conversations` (create), `GET /api/v1/chat/conversations`, `GET/POST /api/v1/chat/conversations/:id/messages`, `POST /api/v1/chat/conversations/:id/read`, `POST /api/v1/chat/conversations/:id/share-contact`, `POST /api/v1/chat/conversations/:id/demo-request`
- **Support:** `GET /api/v1/support/conversation`, `POST /api/v1/support/messages`, `PUT /api/v1/support/conversation/status`
- **IAP:** `POST /api/v1/iap/verify` (receipt verification)
- **Legal:** `GET /api/v1/legal/required`, `POST /api/v1/legal/accept`, `GET /api/v1/legal/public` (public, no auth)
- **Public (no auth):** `GET /api/v1/subscription-plans`, `GET /api/v1/boosters`, `GET /api/v1/onboarding/data`
- **Me:** `GET /api/v1/me/subscription`, `GET /api/v1/me/transactions`, `GET/PUT /api/v1/me/notification-preferences`, `GET /api/v1/me/notifications`, `PUT /api/v1/me/notifications/:id/read`

### Admin routes (email/password login → Bearer token)

- **Auth:** `POST /api/v1/admin/auth/login`, `GET /api/v1/admin/auth/me`
- **Dashboard:** `GET /api/v1/admin/stats`
- **Users:** `GET /api/v1/admin/users`, `POST /api/v1/admin/users/:id/approve`, `POST /api/v1/admin/users/:id/reject`, `POST /api/v1/admin/users/:id/ban`
- **Support:** `GET /api/v1/admin/support-tickets`, `POST /api/v1/admin/support-tickets/:id/reply`
- **Plans & boosters:** `GET/POST/PUT /api/v1/admin/subscription-plans`, `GET /api/v1/admin/boosters`
- **Financial:** `GET /api/v1/admin/subscriptions`, `GET /api/v1/admin/transactions`
- **Legal:** `GET/POST /api/v1/admin/legal`, `GET /api/v1/admin/legal/:id`
- **Content:** `GET/POST/PUT /api/v1/admin/lesson-types`, `GET/POST /api/v1/admin/locations`, `GET/POST /api/v1/admin/school-types`, `GET/POST /api/v1/admin/schools`

Responses follow the spec: `{ success, data?, error?, meta? }`.  
**i18n:** Send `Accept-Language` (e.g. `tr` or `en`) and error `message` in responses will be returned in that language when available.

## Design (web)

- **Colors:** Electric Azure (#2563EB), Mist Blue (#F1F5F9), Carbon/Slate text, Spark Orange / Calm Teal accents (see `design-system.md`).
- **Fonts:** Outfit (headings), Inter (body).
- **Light theme only;** cards use soft blue-tinted shadows.

## License

Proprietary. See project terms.
