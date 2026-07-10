# Candidate Tracker

An internal, staff-only tool for a recruiting team to log and manage job candidates and their applications. Two entities, one relationship: a **Candidate** (a person) has many **Applications** (jobs they applied for).

TypeScript throughout, strict mode, no `any` anywhere.

| Layer | Choice |
|---|---|
| Backend | Fastify 5 + `fastify-type-provider-zod` v4 |
| Validation | Zod 3 — one schema per shape, shared by both apps |
| ORM / DB | Prisma 5 + PostgreSQL 15 |
| Frontend | React 18, TanStack Query v5, React Router 6, Tailwind 3, Recharts 2 |
| Tests | Vitest + Fastify `inject()` — 68 tests |

---

## Running it

Requires Node 20+ (developed on 22) and Docker.

```bash
npm install
docker compose up -d          # PostgreSQL 15 on :5432

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run db:migrate            # apply migrations
npm run db:seed               # 12 candidates, 31 applications

npm run dev --workspace=apps/api    # http://localhost:3001
npm run dev --workspace=apps/web    # http://localhost:5173
```

Then open **http://localhost:5173**.

```bash
npm test          # 68 backend tests, against a separate candidate_tracker_test database
npm run typecheck # tsc --noEmit across all three workspaces
```

**Interactive API docs live at http://localhost:3001/docs** (OpenAPI JSON at `/docs/json`). They are generated from the same Zod schemas that perform runtime validation, so they cannot drift from the implementation.

> The web dev server uses `strictPort`, so it will refuse to start if `:5173` is taken rather than silently moving to `:5174` — where the API's CORS allow-list would reject it and every request would fail for no visible reason.

---

## Layout

```
apps/api        Fastify backend — routes, plugins, Prisma schema, seed, tests
apps/web        React frontend — pages, components, hooks, API client
packages/shared Zod schemas + inferred types, imported by both apps
```

`packages/shared` is consumed as **TypeScript source**, not a built artifact — `main` points at `src/index.ts` and both Vite and `tsx` transpile it directly. There is no build step to remember, and no chance of the apps compiling against a stale `dist`.

---

## Architectural decisions worth calling out

The full log, written as the build happened, is in [`decisions.md`](decisions.md). The ones that shaped the design:

**One Zod schema is the single source of truth for each shape.** `fastify-type-provider-zod` uses the same schema for runtime validation *and* static type inference, in both directions — `request.body` is typed from it, and `reply.send()` is checked against it. The frontend imports the inferred types from the same package. A field cannot be renamed in one place and forgotten in another; it stops compiling.

**Response schemas are honest about the wire.** Timestamps are declared `z.date().transform(d => d.toISOString())`, so the route can hand Prisma's `Date` straight to `reply.send()` while the inferred type the frontend consumes says `string` — which is what actually arrives after `JSON.parse`. Declaring them as `z.string().datetime()` would have failed at compile time *and* at runtime; declaring them `z.date()` would have lied to the frontend.

**Cross-entity search is one query, not two.** `GET /api/applications?search=` matches an application's own `jobTitle`/`company`/`source`/`notes` **and** its candidate's `name`/`email`/`location`, in a single Prisma `findMany` whose nested relation filters compile to SQL `LEFT JOIN`s. Verified by reading Prisma's query log: every predicate is pushed into Postgres, nothing is fetched into Node and filtered there, and every value is a bound parameter (`'; DROP TABLE "Application"; --` as a search term returns zero rows and touches nothing).

**Every dashboard metric is computed in the database.** Four `count()` calls, one `groupBy`, and one bounded `findMany({ take: 5 })`, all issued concurrently. The only rows that cross into Node are the five most-recent applications. Nothing is derived from a full-list fetch.

**One global `setErrorHandler`; routes never build an error response.** Routes `throw`; the handler maps Zod failures to 400 with a field-level `issues` array, Prisma's `P2002` to 409, `P2025` to 404, `P2003` to 400, and everything else to a logged 500 with a generic message. Because `issues[].path` carries the offending *field name*, a form can render the message under the right input — and a **409 duplicate email lands on the email field with no special-casing**, exactly like a 400 does.

**No route does a read-then-write existence check.** Prisma 5's `extendedWhereUnique` allows `where: { id, deletedAt: null }` on `update`/`delete`, and `connect: { id, deletedAt: null }` when creating an application. A miss raises `P2025`, which the global handler turns into a 404. This removes a time-of-check-to-time-of-use race from every mutating route, and means an application can never be created against a soft-deleted candidate.

**Soft delete is explicit, not middleware.** Every Candidate query carries `where: { deletedAt: null }`. Applications belonging to a soft-deleted candidate disappear from the applications list, from search, from the dashboard, and from their own detail route — they are hidden, not removed. (The brief does not spell this out; the interpretation is recorded in `decisions.md`.)

**The seed contains a deliberate tripwire.** One candidate is soft-deleted and has two applications, one of them `hired` this month. If the `deletedAt` filter ever regresses, the candidate list jumps from 12 to 13, `totalApplications` from 31 to 33, and `hiredThisMonth` from 2 to 3 — the bug surfaces on the dashboard instead of lurking.

**List state lives in the URL.** `/applications?search=elena&status=hired&page=2` is the entire state of that page. Clicking into a row and pressing Back returns to the same filtered page rather than page 1 of an unfiltered list, and a filtered view is linkable. Only the search box is debounced (350ms); the status and date filters commit immediately.

**The chart's colours were computed, not chosen.** The six status colours were validated for colourblind separation against the card surface. The ordering shipped scores a worst-adjacent-pair ΔE of 24.2; the more intuitive mapping (hired = green, rejected = red) scores 13.3, because it places green next to red — the exact pair deuteranopes cannot distinguish. Two of the six hues fall below 3:1 contrast on white, so the legend carries labels **and** counts rather than relying on the slices. Reordering `src/lib/status.ts` silently degrades this.

---

## Known limitations

**`salaryExpectation` cannot be cleared once set.** In the shared schema it is `.positive().optional()` — optional but not *nullable*. Omitting the key leaves the column untouched (Prisma's `undefined` semantics), and sending `null` is coerced to `0`, which fails `.positive()` with a 400. So a salary can be set and changed, but not removed. Every other optional field clears correctly, because blank text inputs are normalised `"" → null`. The fix is one line — `z.union([z.null(), z.coerce.number().int().positive()]).optional()` — but it changes the API contract and its tests, so it was left for a deliberate decision rather than slipped in late. The edit form states the limitation next to the field.

**"Hired this month" is measured on `appliedAt`, not on when the status changed.** The schema has no `hiredAt` column, so there is no record of *when* an application became `hired`. `updatedAt` would be a natural proxy, but the seed writes every row at seed time, so it would place every hired application in the current month and the metric would silently equal total-hired. A production system would add a `hiredAt` column or a status-transition audit table.

**`%` and `_` in a search term act as SQL `LIKE` wildcards.** Prisma binds the term as a parameter, so there is no injection risk, but it wraps it as `%term%` for `ILIKE` and any wildcard inside the term keeps its meaning. Searching `50%` behaves as `50<anything>`. Harmless here; a production system would escape them.

**`DateTime` columns are `timestamp(3)`, not `timestamptz`.** No timezone is stored, and "this month" is computed against server time. Fine for a single-region internal tool.

**The production bundle is ~640 kB**, almost entirely Recharts and its d3 dependencies, which trips Vite's 500 kB warning on `npm run build`. Dev mode is unaffected. A `React.lazy` boundary around the dashboard chart would fix it.

**Free-text search columns have no trigram indexes.** At ~12 candidates and ~31 applications, `pg_trgm` would have no measurable effect. Indexes *are* present on `Application.candidateId` (the join column, hit by every cross-entity search), `status`, `appliedAt`, and `Candidate.deletedAt`.

---

## With more time

- **Fix the salary-clearing gap** above, and add a `hiredAt` column so the dashboard metric measures the thing it claims to.
- **Component tests for the frontend.** The backend has 68 route tests; the frontend has none. The highest-value additions would be the debounced search (does typing *n* characters issue exactly one request?) and the form's error mapping (does a 409 land on the email field?) — both were verified by hand, which is not the same as being defended by a test.
- **Optimistic updates** on the mutations, so a status change feels instant instead of waiting for a round trip plus an invalidation.
- **Cursor pagination**, which would matter once a recruiter has more candidates than fit in a few pages of offsets.
- **Prisma's `relationJoins` preview feature.** With the default load strategy, the applications list issues two queries: one JOINed search that does all the filtering, and one that hydrates the parent candidate's display columns. `relationJoins` collapses them into a single `LATERAL JOIN`. It was rejected here because it needs a preview flag in the submitted schema for no functional gain — the *search* is already a single JOIN, and the second query filters nothing.
- **Escape `%` and `_`** in search terms.

---

## Bonus features — deliberately not attempted

Brief §9.1 lists optimistic updates, cursor-based pagination, a Kanban board view, frontend component tests, and a Dockerfile for the API as optional. **None were attempted, and that was a scope decision rather than an oversight.**

This was my first project using Fastify and Vitest. A large share of the hours went into understanding them properly — Fastify's plugin and encapsulation model, how one Zod schema can serve validation and inference in both directions, why a single global error handler beats `try/catch` in every route, and how `inject()` tests a route without binding a socket. Given that, effort went entirely into the scored requirements: the cross-entity search, the dashboard aggregation, and the route tests covering both, which together carry 40% of the rubric.

The one exception is **OpenAPI docs at `/docs`**, which are not a listed bonus. They were added because `fastify-type-provider-zod` exports a transform that converts the *existing* route schemas into OpenAPI — so the documentation costs almost nothing and cannot fall out of date with the code.
