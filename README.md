# Buddy Script — Social Feed

A production-grade social feed built from the provided "Buddy Script" HTML/CSS design, converted to a full-stack **Next.js (App Router)** application with secure authentication, a protected feed, posts with images, public/private visibility, and a complete like + comment + reply + "who-liked" system.

The original design is preserved exactly — the theme's CSS is served verbatim and every component mirrors the original class names.

---

## Features (mapped to the brief)

**Authentication & Authorization**
- Register (first name, last name, email, password), login, logout.
- JWT in **httpOnly, SameSite=Lax** cookies — short-lived access token + rotating refresh token.
- `/feed` is a protected route; unauthenticated users are redirected to `/login` (enforced in `proxy.ts` and re-checked server-side).

**Feed**
- Protected; all users see all **public** posts plus their **own private** posts.
- Newest first, **keyset (cursor) pagination** with infinite scroll.
- Create posts with **text and image**.
- **Like / unlike** posts with correct persisted state.
- **Comments, replies**, and like/unlike on both.
- **"Who liked"** a post, comment, or reply (modal).
- **Public / private** posts — private visible only to the author (enforced in every read query).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Route Handlers, Turbopack) + React 19 + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | `jose` (JWT) + `@node-rs/argon2` (argon2id password hashing) |
| Validation | Zod on every request |
| Images | `sharp` re-encode (strips EXIF) → pluggable `StorageAdapter` (local disk) |
| Client data | TanStack Query (infinite feed, optimistic like/comment) |

---

## Getting started (local)

**Prerequisites:** Node 20.9+ and a running PostgreSQL instance.

### Quick start (copy-paste)

Installs dependencies, sets up the database, seeds demo data, and starts the app:

```bash
# 1. install all dependencies
npm install

# 2. create the env file, then edit DATABASE_URL + the two JWT secrets
cp .env.example .env

# 3. create the database schema, generate the Prisma client, and seed demo data
npx prisma migrate dev --name init
npm run db:seed

# 4. start the dev server -> http://localhost:3000
npm run dev
```

> Don't have Postgres locally? Use Docker instead — see [Run with Docker](#run-with-docker) below (no manual DB setup needed).

### Step-by-step

```bash
npm install

# 1. configure env
cp .env.example .env
#   set DATABASE_URL and the two JWT secrets

# 2. create schema + generate client
npx prisma migrate dev

# 3. seed demo data (users, posts, comments, likes)
npm run db:seed

# 4. run
npm run dev        # http://localhost:3000
```

### Seeded demo accounts
All seeded users share the password **`Password123`**:

| Email | Notes |
|---|---|
| `karim@buddy.dev` | author of the liked/commented post + one **private** post |
| `dylan@buddy.dev` | |
| `radovan@buddy.dev` | |
| `ryan@buddy.dev` | |

Log in as `karim` to see his private post; log in as anyone else to confirm it is hidden.

---

## Run with Docker

```bash
docker compose up --build
```

Brings up Postgres + the app (applies migrations on boot via `docker-entrypoint.sh`). App on http://localhost:3000. Set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` in your shell or a `.env` for compose to pick up. Then seed once:

```bash
docker compose exec app npx prisma db seed
```

---

## Environment variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | secret for the 15-min access token |
| `JWT_REFRESH_SECRET` | secret for the 7-day refresh token |
| `STORAGE_DRIVER` | `local` (disk) — swap point for Blob/S3 |
| `UPLOAD_DIR` | disk path for uploaded images (default `./uploads`) |

---

## API reference

All mutating routes require the `x-buddy-csrf: 1` header (set automatically by the client `api` helper) as CSRF defense-in-depth on top of SameSite cookies.

| Method + path | Purpose |
|---|---|
| `POST /api/auth/register` | create account + session |
| `POST /api/auth/login` | authenticate |
| `POST /api/auth/logout` | clear session |
| `GET  /api/auth/me` | current user |
| `GET  /api/posts?cursor=` | keyset feed (public + own private) |
| `POST /api/posts` | create (multipart: text, visibility, image) |
| `DELETE /api/posts/:id` | delete own post |
| `POST/DELETE /api/posts/:id/like` | like / unlike |
| `GET  /api/posts/:id/likers` | who liked a post |
| `GET  /api/posts/:id/comments` | comments + replies |
| `POST /api/posts/:id/comments` | add comment / reply (`parentId`) |
| `DELETE /api/comments/:id` | delete own comment |
| `POST/DELETE /api/comments/:id/like` | like / unlike |
| `GET  /api/comments/:id/likers` | who liked a comment/reply |
| `GET  /api/uploads/*` | serve a stored image |

---

## Database schema

```
User
  id            PK, cuid
  firstName     text
  lastName      text
  email         text, UNIQUE
  passwordHash  text
  avatarUrl     text, nullable
  createdAt     timestamp

Post
  id            PK, cuid
  authorId      FK -> User.id (cascade)
  text          text, nullable
  imageUrl      text, nullable
  visibility    enum { PUBLIC, PRIVATE }
  likeCount     int (denormalized)
  commentCount  int (denormalized)
  createdAt     timestamp
  index (createdAt, id)        -- keyset pagination
  index (authorId, createdAt)

Comment
  id            PK, cuid
  postId        FK -> Post.id (cascade)
  authorId      FK -> User.id (cascade)
  parentId      FK -> Comment.id (cascade), nullable   -- self-ref = reply
  text          text
  likeCount     int (denormalized)
  createdAt     timestamp
  index (postId, parentId, createdAt)

PostLike
  userId        FK -> User.id (cascade)
  postId        FK -> Post.id (cascade)
  createdAt     timestamp
  PK (userId, postId)          -- idempotent like
  index (postId, createdAt)

CommentLike
  userId        FK -> User.id (cascade)
  commentId     FK -> Comment.id (cascade)
  createdAt     timestamp
  PK (userId, commentId)
  index (commentId, createdAt)
```

Relations: `User 1─* Post`, `User 1─* Comment`, `Post 1─* Comment`, `Comment 1─* Comment` (replies), `User *─* Post` via `PostLike`, `User *─* Comment` via `CommentLike`. Canonical source: `prisma/schema.prisma`.

---

## Designed for scale (millions of posts / reads)

- **Keyset pagination** on `(createdAt, id)` — constant-time deep pages (no `OFFSET`).
- **Denormalized `likeCount` / `commentCount`** — reads never `COUNT(*)`; counters bumped in the same transaction as the like/comment.
- **Separate like tables** with composite PKs — idempotent likes, and "did I like this" is an index-only lookup.
- **No N+1** — the viewer's like-state for a whole feed page is resolved in one batched query.
- **Images off the database** — only URLs are stored; files are re-encoded and served with long-lived immutable cache headers.
- Extensible: the counters + cursor design maps cleanly onto Redis caching and read replicas.

---

## Security

**Passwords** (`lib/password.ts`)
- argon2id hashing (memory-hard, GPU-resistant). Passwords are never returned in any response.

**Authentication & sessions** (`lib/auth.ts`, `proxy.ts`)
- JWT stored in **httpOnly** cookies — not readable by JavaScript, which blocks XSS token theft.
- Cookie flags: `Secure` (in production), `SameSite=Lax`, `Path=/`.
- Short-lived **access** token (15 min) + rotating **refresh** token (7 days); the access cookie is silently renewed from the refresh token in `proxy.ts`.
- `/feed` is guarded by `proxy.ts` and re-checked server-side in the page — never UI-only.

**CSRF** (`lib/csrf.ts`)
- Every mutating route requires the custom header `x-buddy-csrf: 1`. Cross-site forms/images cannot set custom headers and CORS blocks cross-origin requests — defense-in-depth on top of SameSite cookies.

**Authorization & privacy** (`lib/access.ts`, route handlers)
- Every read query enforces `visibility = PUBLIC OR authorId = me`, so private posts never leak.
- A private post the viewer can't see returns **404** (not 403) — indistinguishable from a non-existent one.
- Deleting a post/comment is author-only, verified server-side.

**Input validation** (`lib/validation.ts`)
- A Zod schema validates every request (body, query, params, multipart). Invalid input → `422`.

**File upload hardening** (`lib/storage.ts`, `app/api/uploads`)
- Mime whitelist (jpeg/png/webp) + 5 MB size cap.
- `sharp` re-encodes every upload → strips EXIF/embedded payloads and normalizes the format.
- Random, unguessable filenames; the original filename is never trusted.
- Serving is path-traversal-safe (confined to the upload dir), `nosniff`, `Content-Disposition: inline`, no execution.

**Rate limiting** (`lib/rateLimit.ts`)
- Fixed-window limiter on auth (login/register) and write endpoints to brake brute-force / spam. (Swap for Redis in multi-instance prod — same interface.)

**Response headers** (`next.config.ts`)
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (clickjacking), `Referrer-Policy`, `Permissions-Policy`.

**Anti-enumeration**
- Login returns a generic "Invalid email or password" and always runs the hash-verify path to reduce timing signals.

**Secrets**
- JWT secrets and the DB URL live in env only; `.env` is gitignored, `.env.example` is committed.

Verified: missing CSRF → `403`, unauthenticated → `401`, wrong password → generic `401`, path traversal → `400`, non-image upload → `422`.

---

## Deployment (Vercel)

Deploy to Vercel with a hosted Postgres (Neon/Supabase). Because Vercel's filesystem is ephemeral, swap the local-disk storage for a Blob/S3 driver behind the existing `StorageAdapter` interface (`lib/storage.ts`) and set the storage env accordingly. `npm run build` runs `prisma generate`; run `prisma migrate deploy` against the hosted DB.

---

## Project structure

```
app/               routes: (auth)/login,register  (feed)/feed  api/*
components/         auth/*  feed/*  (PostCard, Composer, CommentsSection, LikersModal, …)
lib/               db, auth, password, storage, feed, comments, likes, validation, http
prisma/            schema.prisma, migrations, seed.ts
proxy.ts           route guard (Next 16 middleware convention)
public/assets/     the original theme CSS/images (served verbatim)
```

See **`implementation.md`** for the full design rationale and decisions.
