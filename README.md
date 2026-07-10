# Candidate Tracker

An internal, staff-only tool for a recruiting team to log and manage job candidates and their applications. Two entities, one relationship: a **Candidate** has many **Applications**.

TypeScript throughout, strict mode, no `any`.

| Layer      | Choice                                                              |
| ---------- | ------------------------------------------------------------------- |
| Backend    | Fastify 5 + `fastify-type-provider-zod` v4                          |
| Validation | Zod 3, one schema per shape, shared by both apps                    |
| ORM / DB   | Prisma 5 + PostgreSQL 15                                            |
| Frontend   | React 18, TanStack Query v5, React Router 6, Tailwind 3, Recharts 2 |
| Tests      | Vitest + Fastify `inject()`, 68 tests                               |

---

## Running it

Requires Node 20+ (developed on 22) and Docker.

```bash
npm install
docker compose up -d          # PostgreSQL 15 on :5432

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run db:migrate
npm run db:seed               # 12 candidates, 31 applications

npm run dev --workspace=apps/api    # http://localhost:3001
npm run dev --workspace=apps/web    # http://localhost:5173
```

Open **http://localhost:5173**.

```bash
npm test          # 68 backend tests, against a separate test database
npm run typecheck # tsc --noEmit across all three workspaces
```

Interactive API docs are generated from the same Zod schemas that validate at runtime, so they can't drift from the implementation: **http://localhost:3001/docs**

> `apps/web` uses `strictPort`, so it refuses to start on a busy `:5173` rather than silently moving to `:5174`, where the API's CORS allow-list would reject every request with no obvious cause.

## Layout

```
apps/api        Fastify backend: routes, plugins, Prisma schema, seed, tests
apps/web        React frontend: pages, components, hooks, API client
packages/shared Zod schemas and inferred types, consumed as TS source by both apps (no build step)
```

---

## Architectural decisions worth calling out

- **One Zod schema per shape, used in both directions.** `fastify-type-provider-zod` uses the same schema to validate `request.body` at runtime and to type it statically, and the frontend imports the same inferred types. A field can't be renamed in one layer and forgotten in another, since it stops compiling.
- **Cross-entity search is a single JOIN, not two queries.** `GET /api/applications?search=` matches an application's own fields and its candidate's name, email, and location in one Prisma call. Verified against Prisma's query log that it compiles to one SQL statement with bound parameters, so there's no injection risk.
- **Every dashboard metric is a DB aggregation**, not derived from a full-list fetch: four `count()` calls, one `groupBy`, and one bounded `findMany`, issued concurrently.
- **One global `setErrorHandler`.** Routes `throw` rather than building their own error response; the handler maps Zod errors to 400 with field-level `issues`, Prisma's `P2002` to 409, `P2025` to 404, and everything else to a logged 500 with a generic message to the client. No route does a read-then-write existence check either, since Prisma 5's `extendedWhereUnique` (`where: { id, deletedAt: null }`) removes that race entirely.
- **Soft delete is explicit, not middleware.** Every Candidate query filters `deletedAt: null` by hand. The seed deliberately includes one soft-deleted candidate with applications as a live regression check, so if the filter ever breaks, the dashboard numbers visibly shift.
- **List filters live in the URL, not component state.** A filtered view is linkable, and pressing Back returns to the same filtered page instead of an unfiltered page one.

## Known limitations

- **`salaryExpectation` can't be cleared once set.** It's optional but not nullable in the shared schema. The fix is a one-line schema change, but it changes the API contract, so it wasn't slipped in unilaterally. The edit form states this next to the field.
- **"Hired this month" is measured on `appliedAt`**, not on when the status actually changed, since there's no `hiredAt` column to measure against.
- **No trigram indexes on free-text search columns.** They'd have no measurable benefit at this data volume (around 12 candidates, 31 applications). Indexes do exist on `candidateId`, `status`, `appliedAt`, and `deletedAt`.
- Search terms containing `%` or `_` behave as SQL wildcards. They're bound as parameters, so there's no injection risk, just an unescaped edge case.

## With more time

Fix the salary-clearing gap and add a `hiredAt` column, write frontend component tests (the backend has 68, the frontend has none), add optimistic updates on mutations, switch to cursor pagination, and escape `%` and `_` in search terms.

## Bonus features not attempted

Brief 9.1's optional items (optimistic updates, cursor pagination, a Kanban view, component tests, an API Dockerfile) were skipped deliberately. This was a first project with Fastify and Vitest, so the hours went into the scored requirements instead: cross-entity search, dashboard aggregation, and the tests covering both. One exception is the OpenAPI docs at `/docs`, added because the type provider generates them from schemas that already exist, at near-zero cost.
