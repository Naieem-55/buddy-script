# Implementation Plan — "Buddy Script" Social Feed

## 1. Context

We are given three static HTML/CSS pages (`login.html`, `registration.html`, `feed.html`) from the "Buddy Script" theme, plus its asset bundle (`assets/css/*`, `assets/js/custom.js`, images, Poppins font). The task is to turn them into a **production-grade** React/Next.js application with real authentication, a protected feed, posts (text + image, public/private), and a full like + comment + reply + "who-liked" system, modeled to survive **millions of posts and reads**. Security and UX are the top priorities.

The provided design must be preserved exactly — we only wire behavior and add the few UI affordances the requirements need but the static markup lacks.

### 1.1 Technology decisions

| Area | Choice | Rationale |
|---|---|---|
| Stack | **Next.js (App Router) full-stack** | Route Handlers are the backend; one cohesive deployable; SSR gives a fast, secure feed |
| Language | **TypeScript** | Type safety end-to-end (Prisma types flow into API + UI) |
| DB / ORM | **PostgreSQL + Prisma** | Relational model fits posts/comments/likes with FKs + constraints; type-safe queries; scales with indexes + keyset pagination |
| Image storage | **Local disk** via a storage adapter | Simple, no external account for local/self-host; abstracted so it swaps to Blob/S3 for cloud |
| Deploy | **Vercel + hosted Postgres (Neon)** | Easiest live URL for a Next.js app |
| Auth | **JWT in httpOnly cookies** (access + refresh) | Not readable by JS (XSS-safe); works cleanly with SSR + middleware |
| Data fetching | **TanStack Query** | Infinite scroll (cursor) + optimistic mutations for snappy UX |
| Validation | **Zod** | One schema validates every request input |
| Password hashing | **argon2id** | Modern memory-hard KDF (bcrypt fallback) |
| Image processing | **sharp** | Re-encode uploads, strip EXIF, normalize |

### 1.2 Gaps between the static design and the requirements (and how we resolve them)

1. **Register form lacks first/last name.** The requirement mandates them. We add two inputs styled with the existing `_social_registration_form_input` / `_social_registration_label` / `_social_registration_input` classes so the design is untouched. We also add real "repeat password" validation and wire the (mislabelled "Login now") submit button as the register action.
2. **No "who liked" modal in the markup.** The requirement demands showing who liked a post/comment/reply. We add a lightweight, theme-tokened popover/modal opened from the existing reactor-avatar strip (`_feed_inner_timeline_total_reacts_image`) and the comment `_total` count.
3. **Design shows multi-emoji reactions** (`Haha`, thumbs, heart). The requirement only says *like/unlike*, so we implement a **binary like** while keeping the exact button markup/classes; `_feed_reaction_active` marks the liked state.
4. **Storage vs deploy conflict.** Vercel's serverless filesystem is ephemeral and read-only except `/tmp`, so "local disk" uploads will not persist on Vercel. Resolved with a `StorageAdapter` interface: `LocalDiskStorage` for self-host/dev, `VercelBlobStorage` (or S3) when `DEPLOY_TARGET=vercel`. The live demo uses Blob; local `docker compose` uses disk.
5. **Decorative vs functional.** Left sidebar (Explore / Suggested / Events), right sidebar (You-Might-Like / Friends), the stories strip, notifications dropdown, search, and the Video/Event/Article composer tabs are **decorative** — rendered statically to preserve the design, not wired. Only the Photo tab drives the real image upload. Called out explicitly so scope is unambiguous.

---

## 2. Architecture

```
buddy-script/                 (Next.js App Router, TypeScript)
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (auth)/register/page.tsx
│  ├─ (feed)/feed/page.tsx           ← protected, SSR first page
│  ├─ layout.tsx                     ← Poppins + the 4 theme CSS files
│  └─ api/
│     ├─ auth/register|login|logout|me/route.ts
│     ├─ posts/route.ts              ← GET feed (keyset), POST create
│     ├─ posts/[id]/route.ts         ← DELETE
│     ├─ posts/[id]/like/route.ts    ← POST like, DELETE unlike
│     ├─ posts/[id]/likers/route.ts  ← GET who liked
│     ├─ posts/[id]/comments/route.ts← GET list, POST create (+parentId)
│     ├─ comments/[id]/like/route.ts ← POST/DELETE
│     ├─ comments/[id]/likers/route.ts
│     └─ uploads/[...path]/route.ts  ← serves local-disk images
├─ components/                       ← Navbar, Composer, PostCard, ReactionBar,
│                                      CommentBox, CommentThread, LikersModal,
│                                      ThemeProvider, LeftSidebar, RightSidebar…
├─ lib/                              ← auth (jwt, hash), db (prisma client),
│                                      validation (zod), storage adapter,
│                                      rateLimit, feed queries
├─ prisma/schema.prisma
├─ middleware.ts                     ← guards /feed, redirects unauth → /login
├─ public/assets/                    ← copied verbatim from the given design
│                                      (css, images, fonts) — classes preserved
└─ uploads/                          ← local image store (gitignored)
```

**Design-fidelity strategy:** copy `assets/css/{common,main,responsive,bootstrap.min}.css` and images into `public/assets` unchanged; import the four CSS files globally in `app/layout.tsx` in the same order the original HTML used. JSX mirrors the exact class names — **including the theme's typos** (`_feed_inner_timeline_cooment_area`, `_feed_inner_pulic_story`, `_photo_iamge`) — so the CSS matches 1:1. The Bootstrap-JS navbar collapse and the two `custom.js` dropdowns plus the dark-mode toggle are re-implemented as React state (see §6 Theming).

---

## 3. Data model (Prisma / PostgreSQL)

```prisma
model User {
  id           String   @id @default(cuid())
  firstName    String
  lastName     String
  email        String   @unique
  passwordHash String
  avatarUrl    String?
  createdAt    DateTime @default(now())
  posts        Post[]
  comments     Comment[]
  postLikes    PostLike[]
  commentLikes CommentLike[]
}

enum Visibility { PUBLIC PRIVATE }

model Post {
  id           String     @id @default(cuid())
  authorId     String
  author       User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  text         String?
  imageUrl     String?
  visibility   Visibility @default(PUBLIC)
  likeCount    Int        @default(0)   // denormalized
  commentCount Int        @default(0)   // denormalized
  createdAt    DateTime   @default(now())
  comments     Comment[]
  likes        PostLike[]
  @@index([createdAt, id])              // keyset pagination
  @@index([authorId, createdAt])        // author's own private posts
}

model Comment {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parentId  String?                       // self-ref → reply (1 level in UI)
  parent    Comment? @relation("Replies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[] @relation("Replies")
  text      String
  likeCount Int      @default(0)
  createdAt DateTime @default(now())
  likes     CommentLike[]
  @@index([postId, parentId, createdAt])
}

model PostLike {
  userId    String
  postId    String
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([userId, postId])                  // idempotent like, fast "did I like"
  @@index([postId])                       // "who liked" + count
}

model CommentLike {
  userId    String
  commentId String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([userId, commentId])
  @@index([commentId])
}
```

**Why this shape (scale rationale):**

- **Separate like tables** (not a polymorphic table) → real foreign keys, cascade deletes, and a composite primary key that makes like/unlike idempotent and "has the current user liked this" an index-only lookup.
- **Denormalized `likeCount` / `commentCount`** → never run `COUNT(*)` over millions of rows on a read; counters are bumped inside the same transaction as the like/comment insert.
- **`@@index([createdAt, id])`** → enables **keyset (cursor) pagination** instead of `OFFSET`, which degrades linearly on deep pages.
- **Self-referential comments** → comments and replies live in one table; the UI caps at two visible levels but the data supports deeper.
- **Follows/friend-graph intentionally omitted** — the requirement says "all users see all posts," so feed visibility is simply `PUBLIC OR authorId = me`; no graph is needed for the MVP (the sidebar follow UI stays decorative).

---

## 4. Feed query (the millions-of-reads path)

```sql
-- page 1: no cursor; later pages pass the last (createdAt, id)
SELECT * FROM "Post"
WHERE (visibility = 'PUBLIC' OR "authorId" = $me)
  AND ("createdAt", id) < ($cursorCreatedAt, $cursorId)   -- keyset
ORDER BY "createdAt" DESC, id DESC
LIMIT 20;
```

- After fetching the 20 post ids, **one** batched query — `SELECT postId FROM "PostLike" WHERE userId = $me AND postId IN (...)` — resolves the current user's like-state for the whole page, avoiding N+1.
- `likeCount` / `commentCount` come straight off the row (denormalized).
- Comments load lazily per post (`GET /posts/:id/comments`): top-level keyset + nested replies; they are **not** shipped in the feed payload.
- The response returns a `nextCursor` for TanStack Query infinite scroll.
- **Future scaling levers** (documented, not built for MVP): Redis cache for hot counters and the first feed page, PgBouncer / Neon pooled connections, read replicas, and a fan-out-on-write timeline table if a follow graph is later introduced.

---

## 5. API surface (Route Handlers, all Zod-validated)

| Method + path | Purpose | Authz |
|---|---|---|
| `POST /api/auth/register` | firstName, lastName, email, password → create + set cookies | public |
| `POST /api/auth/login` | email + password → set cookies | public |
| `POST /api/auth/logout` | clear cookies | auth |
| `GET  /api/auth/me` | current user | auth |
| `GET  /api/posts?cursor=` | keyset feed (public + own private) | auth |
| `POST /api/posts` | multipart: text, image, visibility | auth |
| `DELETE /api/posts/:id` | delete own post | author only |
| `POST/DELETE /api/posts/:id/like` | like / unlike (idempotent, txn bumps counter) | auth |
| `GET  /api/posts/:id/likers` | paginated liker list (feeds the modal) | auth |
| `GET  /api/posts/:id/comments` | top-level + replies | auth (respects privacy) |
| `POST /api/posts/:id/comments` | body: text, parentId? | auth |
| `DELETE /api/comments/:id` | delete own comment | author only |
| `POST/DELETE /api/comments/:id/like` | like / unlike | auth |
| `GET  /api/comments/:id/likers` | who liked a comment/reply | auth |
| `GET  /api/uploads/*` | serve a local-disk image | public (unguessable name) |

Private-post enforcement lives in **every** read path (`visibility = PUBLIC OR authorId = me`), never only in the UI.

---

## 6. Security (top priority)

- **Passwords:** `argon2id` hashing (bcrypt fallback). Never returned in any response.
- **JWT in httpOnly cookies:** short-lived **access** (~15 min) + rotating **refresh** (~7 d); `HttpOnly; Secure; SameSite=Lax; Path=/`. No token in JS-readable storage, blocking XSS token theft.
- **CSRF:** SameSite=Lax plus a required custom header / double-submit token on state-changing routes.
- **Validation:** a Zod schema on every handler input (body, query, params, multipart).
- **Authorization:** server-side ownership checks for delete/edit; private posts filtered in queries, not the client.
- **Uploads:** mime whitelist (jpeg/png/webp), size cap (~5 MB), random unguessable filename, re-encode with `sharp` to strip EXIF/metadata and normalize, no trust in the original filename, served with a correct `Content-Type` + `Content-Disposition: inline` and no execution.
- **Rate limiting** on auth + write endpoints (in-memory for dev, Upstash Redis for prod).
- **Security headers** (CSP, `X-Content-Type-Options`, `Referrer-Policy`) via `next.config` headers / middleware.
- **Secrets** only in env (`.env`, never committed); an `.env.example` is provided.
- **Generic auth errors** ("invalid credentials") to avoid user enumeration.

---

## 7. Frontend behavior

- **Routing / guard:** `middleware.ts` checks the access cookie; an unauthenticated request to `/feed` redirects to `/login`, and an authenticated request to `/login` or `/register` redirects to `/feed`. The feed page SSR-renders the first keyset page for fast first paint.
- **Data layer:** TanStack Query — `useInfiniteQuery` for the feed (cursor), and mutations for post/like/comment with **optimistic updates** (instant like toggle, rollback on error) for a snappy feel.
- **Composer:** the textarea (`_textarea`) captures post text; the **Photo** button opens a file picker → preview → upload on Post; a **privacy toggle** (Public/Private) is added minimally near the Post button using existing button styles. The Post button (`_feed_inner_text_area_btn_link`) submits.
- **PostCard:** exact `_feed_inner_timeline_post_area` markup with real author/time/privacy, image, and a `ReactionBar` (like/comment/share — like is live, share decorative); the reactor strip opens the `LikersModal`.
- **Comments / replies:** `CommentThread` renders top-level `_comment_main` items; each has a live Like and Reply from `_comment_reply_list`; Reply reveals the nested `_feed_inner_comment_box`; reply likes are wired; "View N previous comments" paginates.
- **LikersModal:** a new theme-tokened component that lists users from the `/likers` endpoints for a post, comment, or reply.
- **Theming:** a `ThemeProvider` reproduces `custom.js` — it toggles `_dark_wrapper` on the root wrapper (persisted to `localStorage`, improving on the original which resets on reload). The profile dropdown, post-options dropdown, and navbar collapse are re-implemented as React state, replacing Bootstrap JS + `custom.js`.

---

## 8. Deployment

- **Primary (live URL):** Vercel + **Neon** Postgres (pooled connection string for serverless). Because the Vercel filesystem is ephemeral, `DEPLOY_TARGET=vercel` selects `VercelBlobStorage` for images. `prisma migrate deploy` runs in the build.
- **Alternative (self-host / offline demo):** a `docker-compose.yml` (app + Postgres) using `LocalDiskStorage` writing to a mounted `uploads/` volume, served by `/api/uploads/*`.
- Ships with `.env.example`, a README with setup steps, and a **seed script** (a few users + public/private posts + comments/replies/likes) for an immediately populated demo.

---

## 9. Build order (incremental, each step verifiable)

1. Scaffold Next.js + TS + Prisma; copy `assets/*` → `public/assets`; global CSS import; render a static `/login` that pixel-matches the design.
2. Prisma schema + first migration on local Postgres; Prisma client in `lib/db`.
3. Auth: register/login/logout/me, argon2, JWT cookies, Zod, `middleware.ts` guard. Wire the login + register pages (add first/last name fields).
4. Feed read path: seed data → `GET /api/posts` keyset → SSR `/feed` + infinite scroll rendering real `PostCard`s newest-first.
5. Create post (text + image upload via the storage adapter + `sharp`) + privacy; optimistic prepend.
6. Post like/unlike (transaction + counter) + `LikersModal`; correct persisted like state on reload.
7. Comments + replies + their like/unlike + likers.
8. Theming/dropdowns/navbar port; responsive check; security headers + rate limiting; polish.
9. Docker compose + Vercel deploy + seed; README + this decisions doc; record the walkthrough.

---

## 10. Verification (end-to-end)

- **Auth:** register a new user → auto-login → `/feed`; logout → `/feed` redirects to `/login`; hitting `/api/posts` without a cookie → 401; a wrong password → generic error; the password never appears in any JSON response (verify in the network tab and that the DB stores an argon2 hash).
- **Privacy:** user A creates a PRIVATE post → user B's feed and B's `GET /api/posts` omit it; A still sees it. A public post is visible to all.
- **Ordering:** create three posts → the newest appears at the top; keyset pagination returns non-overlapping pages (verify `nextCursor`).
- **Likes:** like a post → count +1, button shows `_feed_reaction_active`; reload → state persists; unlike → −1; a double POST like → still 1 (idempotent). Same for comments and replies.
- **Who-liked:** several users like a post/comment → the modal lists exactly them.
- **Comments/replies:** add a comment, add a reply under it → both render, counts update, both are likeable.
- **Uploads:** upload a jpg/png → renders from `/api/uploads/*`; oversized / wrong-mime files are rejected; EXIF is stripped (verify the re-encoded output).
- **Design fidelity:** overlay the rendered `/login`, `/register`, `/feed` against the original HTML in both light and dark mode; class names match.
- **Automated:** a few integration tests (auth, privacy filter, like idempotency, keyset) via Vitest + a Prisma test DB; `next build` and `tsc --noEmit` are clean.

---

## 11. Deliverables

1. **GitHub repo** — this codebase, with README, `.env.example`, seed script, and `docker-compose.yml`.
2. **`implementation.md`** — this document (what was built and the decisions made).
3. **Live URL** — Vercel + Neon.
4. **Unlisted YouTube walkthrough** — covered by the §10 Verification script.
