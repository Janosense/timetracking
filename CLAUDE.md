# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Nuxt dev server on http://localhost:3000
- `npm run build` — production build (Node server output in `.output/`)
- `npm run generate` — static generation
- `npm run preview` — preview production build
- `npm run db:migrate` — apply Drizzle migrations against the configured DB
- `npm run vercel-build` — migrate then build (used by Vercel)
- No test runner or linter is configured in this repo.

## Environment

Copy `.env.example` to `.env`. Variables:
- `NUXT_ADMIN_PIN` — PIN required at `/admin/login` (exposed via `runtimeConfig.adminPin`).
- `NUXT_JWT_SECRET` — HS256 signing key for the admin session JWT.
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — set for production (Turso/libsql). Unset → local file `./race.db` via `@libsql/client`.

`drizzle.config.ts` reads these envs directly; for local migrations against the file DB, just run `db:migrate` with no Turso vars set.

## Architecture

Nuxt 4 app (`app/` for client, `server/` for Nitro API routes) running a race-timing system for two competition formats. Backed by SQLite/libsql via Drizzle ORM. Nuxt UI v4 + Tailwind v4 for the UI.

### Domain model (`server/db/schema.ts`)

Three tables, all keyed by `text` UUIDs and using `integer` epoch-ms timestamps:
- `competitions` — `type` ∈ {`classic`, `backyard_ultra`}, `status` ∈ {`pending`, `active`, `completed`}. Classic uses `controlTimeMinutes`; Backyard Ultra uses `lapDurationMinutes` (default 60) and optional `targetLaps`.
- `participants` — has a `bibNumber` (unique per competition), optional `name`/`gender`, and a `status` lifecycle: `active` → `dnf` | `finisher` | `prize_winner` | `winner`.
- `finishRecords` — one row per (participant, lapNumber). `finishTimeMs` is **relative to `competition.actualStart`** (cumulative elapsed at finish), not a wall-clock time. Per-lap time is derived as `finishTimeMs - (lapNumber - 1) * lapDurationMs`.

### Competition state machine (`server/utils/competition.ts`)

State transitions are computed **lazily on read**, not via background jobs. Every call to `GET /api/competitions/[id]` runs, in order:
1. `processAutoStart` — flips `pending` → `active` when `scheduledStart` is reached.
2. `processClassicExpiry` — for classic competitions, after `controlTimeMinutes` elapses, marks remaining `active` participants as `dnf` and the competition `completed`.
3. `processLapTransitions` — for backyard ultras, walks every completed lap window and DNFs participants without a finish record for that lap; handles `targetLaps` completion (`finalizeTargetBackyard` ranks by total cumulative lap time) and the no-target last-runner-standing case.

`POST /participants/[number]/finish` also calls `processLapTransitions` before recording, so finishes can't be backdated into a lap the participant already missed. Classic finishes assign status inline by position (1st=winner, 2nd/3rd=prize_winner, rest=finisher); the helper `recomputeClassicStatuses` exists to rebuild this if records change. `POST /[id]/end` is a manual override that DNFs all active participants and completes the competition.

When editing this file, preserve the invariant that all transitions are idempotent and safe to re-run on every read — the API has no other scheduler.

### Response shape

`buildCompetitionResponse` (same file) is the single source of truth for the **GET** `/api/competitions/[id]` response. It joins competitions, participants, and finish records, computes derived fields (`currentLap`, per-participant `laps[]`, `completedLaps`, `lastLapTimeMs`, `totalTimeMs`, `currentLapFinished`). Client pages key off this shape — extend it rather than creating parallel endpoints.

The mutating endpoints intentionally return slim payloads (`POST .../finish` → `{ ok, lapNumber, finishTimeMs }`; `DELETE .../finish` → `{ ok: true }`; `POST .../start`, `POST .../end` → `{ ok }`). Do **not** restore `buildCompetitionResponse` to these endpoints — the admin page relies on small responses + lazy poll reconciliation to avoid blocking on Turso round-trips (see "Time and write model" below).

### Time and write model

Two invariants in the finish flow that aren't obvious from reading individual files:

- **`finishTimeMs` is sourced from the admin's client clock at click time** and sent in the POST body. The server validates `finishTimeMs ≤ (Date.now() - actualStart) + 5000` and persists it verbatim. For backyard ultras the server derives `lapNumber` from this value (`floor(finishTimeMs / lapDurationMs) + 1`), **not** from server `Date.now()`. Reverting to a server-computed `finishTimeMs` reintroduces a 1–2s skew on Vercel because every Turso round-trip adds latency before the timestamp would be captured.
- **The admin page is optimistic, fire-and-forget**, owned by `app/composables/useOptimisticCompetition.ts`. On click it mutates `competition.value` synchronously (pushes a `LapResult`, updates `completedLaps`/`status`/`currentLapFinished`, recomputes classic ranking), then fires the POST without awaiting. Failures retry on backoff `[1s, 2s, 4s, 8s]`; persistent failures surface in a `UAlert` banner with retry/discard actions. The 2s poll calls `mergeWithPending` to overlay still-in-flight writes onto fresh server data — never replace this with a naive `refresh()`/`useAsyncData` re-run, which would clobber pending optimistic state. For the same reason, `RaceTimer`'s `@lap-end` / `@control-time-end` events go through `poll()`, not `refresh()`.

### Auth

PIN-gated admin area. `POST /api/auth/login` checks `pin === String(config.adminPin)` (note the explicit string coerce — see commit `474d337`), then signs a 24h JWT (`jose`, HS256) and sets it as the `admin_token` httpOnly cookie. `server/utils/auth.ts::requireAdmin` validates the cookie on every mutating route. The client-side `app/middleware/admin.ts` route middleware calls `/api/auth/verify` and forwards SSR cookies via `useRequestHeaders(['cookie'])` so SSR auth checks work — keep that pattern when adding admin pages.

### DB access

`server/db/index.ts::getDb()` is the only entry point — it lazily constructs a singleton libsql client. Always go through it; do not create new clients in handlers.

### Frontend

- Pages: public `/` and `/competitions/[id]`; admin `/admin/login`, `/admin/competitions`, `/admin/competitions/new`, `/admin/competitions/[id]`.
- Layouts: `default.vue` for public, `admin.vue` for admin pages (apply via `definePageMeta({ layout: 'admin', middleware: 'admin' })`).
- Composables: `useAdminAuth` (login/logout/checkAuth), `useFormatTime` (ms → display), `useCsvParser` (participant import), `useOptimisticCompetition` (admin race-day write layer — pending-writes map, optimistic apply/revert, retry queue, poll-merge; the only place to extend if you change finish/undo behavior).
- Nuxt UI v4 components (`UButton`, `UBadge`, `UApp`, …) wrap the app via `app.vue`'s `<UApp>` root.

### MCP servers

`.mcp.json` registers `nuxt-remote` and `nuxt-ui-remote` HTTP MCP servers for live Nuxt and Nuxt UI documentation — prefer these over guessing API shapes for Nuxt UI components or Nuxt config.
