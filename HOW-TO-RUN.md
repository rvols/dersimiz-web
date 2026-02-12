# How to run the Dersimiz website (local dev)

This guide explains how to run the **website** (Next.js) with `npm run dev`, what to put in `.env`, and how to run the API if you need admin login or full features.

---

## Prerequisites

Per [what-is-dersimiz.md](what-is-dersimiz.md) architecture:

- **Node.js 20+** ([nodejs.org](https://nodejs.org))
- **npm** (comes with Node)
- **PostgreSQL 15+** (required for API; main database)
- **Redis 7** (required for API; session and API caching). Run locally or: `docker run -d -p 6379:6379 redis:7-alpine redis-server --appendonly yes`

---

## Option A: Website only (landing pages)

You can run just the Next.js site to see the **landing pages** (no admin, no API calls).

### 1. Environment

```bash
cd web
cp .env.example .env
```

Edit `web/.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | API base URL. For local API use `http://localhost:3000`. For website-only use any placeholder, e.g. `http://localhost:3000`. |

Example `web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Install and run

```bash
cd web
npm install
npm run dev
```

- By default Next.js runs on **port 3000**. If you will run the API on 3000 too, start the web on another port:

  **Windows (PowerShell):**
  ```powershell
  $env:PORT=3001; npm run dev
  ```

  **macOS/Linux:**
  ```bash
  PORT=3001 npm run dev
  ```

- **Landing:** http://localhost:3000 (or http://localhost:3001 if you used PORT=3001). Language is chosen by browser (Accept-Language) or the in-page TR/EN switcher.

---

## Option B: Website + API (admin panel and full features)

To use the **admin panel** and any API-dependent features, run both the API and the web app.

### 1. Database

Create a PostgreSQL database (and user if you need one):

```bash
createdb dersimiz
```

Or in `psql`:

```sql
CREATE DATABASE dersimiz;
-- CREATE USER dersimiz WITH PASSWORD 'yourpassword';
```

### 2. API – environment and run

```bash
cd api
cp .env.example .env
```

Edit `api/.env`. Minimum:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/dersimiz` |
| `REDIS_URL` | Yes | Redis connection string (per doc: session and API caching), e.g. `redis://localhost:6379` |
| `JWT_SECRET` | Yes | Secret for app JWT tokens (any long random string) |
| `ADMIN_JWT_SECRET` | Yes | Secret for admin JWT tokens (any long random string) |

Example `api/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/dersimiz
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-app-jwt-secret-min-32-chars
ADMIN_JWT_SECRET=your-admin-jwt-secret-min-32-chars
```

Optional (defaults are fine for local):

- `ADMIN_EMAIL` – admin login email (default after seed: `admin@dersimiz.com`)
- `ADMIN_PASSWORD` – admin password (default after seed: `Admin123!`)
- `PORT` – API port (default 3000)
- `GEMINI_API_KEY` – Google Gemini API key for AI chat moderation (Gemini 2.5 Flash). If unset, text messages are approved without moderation.
- `BASE_URL` – Public API URL for avatar image links. If unset, uses the request host. When the mobile app uploads via a LAN IP (e.g. 192.168.1.122) and the admin uses localhost, the admin panel resolves avatar URLs to its `NEXT_PUBLIC_API_URL` so images load correctly.

**SMS (OTP – Vatan SMS):**  
To send real OTP codes by SMS, set these in `api/.env` (from [Vatan SMS](https://api.vatansms.net)):

| Variable | Required | Description |
|----------|----------|-------------|
| `VATAN_SMS_API_ID` | If using SMS | API ID from Vatan SMS |
| `VATAN_SMS_API_KEY` | If using SMS | API Key from Vatan SMS |
| `VATAN_SMS_SENDER` | If using SMS | Sender header (gönderici başlığı) |

Optional SMS:

- `VATAN_SMS_MESSAGE_TYPE` – `normal` or `turkce` (default: `normal`)
- `VATAN_SMS_MESSAGE_TEMPLATE` – message body; `{code}` is replaced with the OTP (default: `OTP kodunuz: {code}`)

If these are **not** set, `POST /api/v1/auth/request-otp` still works: no SMS is sent and the fixed demo code `123456` is stored (for local testing).

Then:

```bash
cd api
npm install
npm run migrate    # applies DB schema
npm run seed       # creates default admin + plans/boosters/lesson types
npm run dev        # API at http://localhost:3000
```

### 3. Web – environment and run

In another terminal:

```bash
cd web
cp .env.example .env
```

Edit `web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Then:

```bash
cd web
npm install
npm run dev
```

- If Next.js uses port 3000 and conflicts with the API, run the web on 3001:
  - **PowerShell:** `$env:PORT=3001; npm run dev`
  - **Bash:** `PORT=3001 npm run dev`

### 4. Open the site

- **Landing:** http://localhost:3000 or http://localhost:3001 (language via browser or TR/EN switcher)
- **Admin:** http://localhost:3000/admin or http://localhost:3001/admin  
  - Log in with: **admin@dersimiz.com** / **Admin123!** (after running `npm run seed` in `api`)

---

## Summary

| Step | Where | Command / action |
|------|--------|-------------------|
| 1 | `web/` | `cp .env.example .env` → set `NEXT_PUBLIC_API_URL` |
| 2 | `web/` | `npm install` then `npm run dev` (use `PORT=3001` if API uses 3000) |
| 3 (optional) | `api/` | `cp .env.example .env` → set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_JWT_SECRET` |
| 4 (optional) | `api/` | `npm install`, `npm run migrate`, `npm run seed`, `npm run dev` |

**Default admin (after seed):** admin@dersimiz.com / Admin123!

For Docker-based run, see the main [README.md](README.md#docker).
