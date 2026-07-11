# Deploying Buddy Script for free

Target stack (all free tiers):

| Piece | Service | Free tier |
|---|---|---|
| App | **Vercel** (Hobby) | free for personal / non-commercial projects |
| Database | **Neon** Postgres | free project, serverless, auto-suspends when idle |
| Images | **Vercel Blob** | free allowance on Hobby; needed because Vercel's filesystem is ephemeral |

> **Why Blob?** On Vercel, anything written to disk disappears when the serverless function ends. The app already abstracts this behind `StorageAdapter` (`lib/storage.ts`) — setting `STORAGE_DRIVER=vercel` switches uploads to Vercel Blob. No other code changes.

---

## 1. Generate your JWT secrets

Keep these somewhere safe — you'll paste them into Vercel in step 4.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # run twice
```

---

## 2. Push the repo to GitHub

```bash
cd buddy-script
git init
git add .
git commit -m "feat: Buddy Script social feed"
git branch -M main
git remote add origin https://github.com/<you>/buddy-script.git
git push -u origin main
```

`.env` and `/uploads` are gitignored — no secrets are committed.

---

## 3. Create the Neon database

1. Sign up at **neon.tech** → **New Project** (pick any region near you).
2. Open **Connection Details** and copy the **Pooled connection** string. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```
   Use the **pooled** one (`-pooler` in the host) — serverless functions open many short-lived connections.

### Apply the schema + seed demo data
Run these from your machine, pointing at Neon:

```bash
# Windows PowerShell
$env:DATABASE_URL="<your-neon-pooled-url>"; npx prisma migrate deploy; npm run db:seed

# macOS / Linux
DATABASE_URL="<your-neon-pooled-url>" npx prisma migrate deploy
DATABASE_URL="<your-neon-pooled-url>" npm run db:seed
```

---

## 4. Deploy on Vercel

1. Sign up at **vercel.com** → **Add New… → Project** → import your GitHub repo.
2. Framework preset is auto-detected as **Next.js**. Leave the build settings alone (`npm run build` already runs `prisma generate`).
3. Before the first deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon **pooled** connection string |
   | `JWT_ACCESS_SECRET` | first hex string from step 1 |
   | `JWT_REFRESH_SECRET` | second hex string from step 1 |
   | `STORAGE_DRIVER` | `vercel` |

4. Click **Deploy**.

---

## 5. Attach a Blob store (for image uploads)

1. In the Vercel project → **Storage** tab → **Create Database** → **Blob** → connect it to this project.
2. Vercel automatically injects `BLOB_READ_WRITE_TOKEN` into the project's environment.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the new env var is picked up.

---

## 6. Verify the live URL

Open the Vercel URL (e.g. `https://buddy-script.vercel.app`) and check:

- `/` redirects to `/login`.
- Log in with a seeded account — `karim@buddy.dev` / `Password123`.
- Feed loads, newest post first.
- Create a post **with an image** → it renders (served from `*.blob.vercel-storage.com`).
- Like / comment / reply / "who liked" all work.
- Log in as `dylan@buddy.dev` → Karim's **private** post is not visible.

---

## Notes & limits

- **Neon free tier auto-suspends** when idle, so the very first request after a pause can take a few seconds. Subsequent requests are fast.
- The in-memory rate limiter (`lib/rateLimit.ts`) is per-instance. That's fine for a demo; for real production traffic back it with Redis (e.g. Upstash) — the interface is unchanged.
- **Vercel Hobby is for non-commercial use.** For a commercial deployment, use a paid plan or self-host with the included `docker-compose.yml` (which uses the local-disk driver and a persistent volume).

---

## Alternative: self-host with Docker

No accounts needed, images persist on a volume:

```bash
docker compose up --build
docker compose exec app npx prisma db seed
```
