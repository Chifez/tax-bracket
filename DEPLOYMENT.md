# Deploying TaxBracket

TaxBracket is a full-stack app built with **TanStack Start + Nitro** (Node.js server), **PostgreSQL** (via Drizzle), and **pg-boss** (job queue). This guide covers deployment on Railway (recommended) and Vercel.

---

## Environment Variables

All required variables are documented in [`.env.example`](.env.example). At minimum you need:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENAI_API_KEY` | From [platform.openai.com](https://platform.openai.com) |
| `CLOUDFLARE_*` | R2 bucket credentials |
| `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console OAuth |
| `GOOGLE_CALLBACK_URL` | `https://your-domain.com/api/auth/google/callback` |

**Optional** (for future caching):
| Variable | Notes |
|----------|-------|
| `REDIS_URL` | Redis connection string — app works without it |

---

## Option 1: Railway (Recommended)

Railway natively supports Node.js, PostgreSQL, and Redis — everything TaxBracket needs in one platform.

### Why Railway?
- **Persistent server** — pg-boss requires long-lived PostgreSQL connections
- **Built-in PostgreSQL & Redis plugins** — no external services needed
- **Auto-deploy from GitHub** — push to `main` → deploy

### Steps

1. **Create a Railway project** at [railway.app](https://railway.app)

2. **Add PostgreSQL**
   - Click **"New"** → **"Database"** → **PostgreSQL**
   - Railway auto-sets `DATABASE_URL` in linked services

3. **Add your app**
   - Click **"New"** → **"GitHub Repo"** → select `TaxBracket`
   - Railway auto-detects Node.js

4. **Configure build**
   ```
   Build Command:  npm ci && npm run build
   Start Command:  node .output/server/index.mjs
   ```
   > The build output is at `.output/` (Nitro default).

5. **Set environment variables**
   - Go to your service → **Variables** tab
   - Add all variables from `.env.example`
   - `DATABASE_URL` is auto-linked from the PostgreSQL plugin
   - Set `NODE_ENV=production`
   - Set `GOOGLE_CALLBACK_URL` to your Railway domain

6. **Run database migrations**
   ```bash
   ```bash
   # One-time: run from your local machine pointing to Railway's DB
   # Note: Use the "Public Networking" / TCP Proxy URL (roundhouse.proxy.rlwy.net), NOT the internal one
   DATABASE_URL="postgresql://postgres:PASSWORD@roundhouse.proxy.rlwy.net:PORT/railway" npx drizzle-kit push
   ```
   Or add a Railway deploy hook:
   ```
   Release Command: npx drizzle-kit push
   ```

7. **Deploy** — Railway auto-deploys on push to `main`

### Adding Redis Later

1. Click **"New"** → **"Database"** → **Redis**
2. Railway auto-provides `REDIS_URL`
3. Reference `REDIS_URL` in your app's variables
4. Redeploy — caching activates automatically

---

## Option 2: Vercel

Vercel works but requires external services for PostgreSQL and Redis, plus a Nitro preset change.

### Caveats
- ⚠️ **Serverless** — pg-boss may not work reliably (needs persistent connections)
- ⚠️ Requires external PostgreSQL (Neon, Supabase, or Railway PostgreSQL)
- ⚠️ Requires external Redis (Upstash) when adding caching

### Steps

1. **Add Vercel preset to Nitro**

   In `vite.config.ts`, update the Nitro plugin:
   ```ts
   nitro({ preset: 'vercel' })
   ```

2. **Push to GitHub** and import in [vercel.com](https://vercel.com)

3. **Set build settings**
   ```
   Build Command:  npm run build
   Output Directory: .vercel/output
   ```

4. **Add external PostgreSQL**
   - Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) for serverless-compatible PostgreSQL
   - Set `DATABASE_URL` in Vercel environment variables

5. **Set all environment variables** in Vercel dashboard → Settings → Environment Variables

6. **Run migrations**
   ```bash
   DATABASE_URL=<your-postgres-url> npx drizzle-kit push
   ```

7. **Deploy**

### Adding Redis Later (Vercel)

Use [Upstash Redis](https://upstash.com) (serverless-compatible):
1. Create a Redis database on Upstash
2. Set `REDIS_URL` in Vercel environment variables
3. Redeploy

---

## CI/CD

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push to `main` and all PRs:

```
Install → Typecheck → Test → Build
```

Both Railway and Vercel auto-deploy from `main` after CI passes. To enforce this:
- **Railway**: Enable "Check suites" in deploy settings
- **Vercel**: Enable "Require CI to pass" in Git integration settings

---

## Quick Reference

| | Railway | Vercel |
|--|---------|--------|
| **Server model** | Persistent Node.js | Serverless functions |
| **PostgreSQL** | Built-in plugin | External (Neon/Supabase) |
| **Redis** | Built-in plugin | External (Upstash) |
| **pg-boss** | ✅ Works | ⚠️ May need workaround |
| **Nitro preset** | Default (node) | `vercel` |
| **Cost** | ~$5/mo hobby | Free tier available |
