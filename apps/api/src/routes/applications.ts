import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Prisma } from "@prisma/client";
import {
  ApiErrorSchema,
  ApplicationCreateSchema,
  ApplicationDetailSchema,
  ApplicationListQuerySchema,
  ApplicationListResponseSchema,
  ApplicationSchema,
  ApplicationUpdateSchema,
} from "@candidate-tracker/shared";

import { prisma } from "../lib/prisma";
import { notFound } from "../lib/http-errors";

const IdParamsSchema = z.object({ id: z.string().uuid() });

/**
 * Every query in this file is scoped to `candidate: { deletedAt: null }`.
 * An application whose candidate has been soft-deleted is invisible to the API —
 * you cannot read it, patch it, or delete it. See decisions.md ("soft-deleted
 * candidates' applications are also hidden").
 */
export const applicationRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /api/applications
   *
   * `connect: { id, deletedAt: null }` does double duty: it links the parent
   * candidate AND asserts they exist and are not soft-deleted. A miss raises
   * Prisma P2025, which the global handler turns into a 404 — no read-then-write
   * existence check, and no race between the check and the insert.
   */
  app.post(
    "/applications",
    {
      schema: {
        tags: ["Applications"],
        summary: "Create an application",
        description:
          "`candidateId` must reference a candidate that exists and is not soft-deleted; otherwise 404. `status` defaults to `applied` and `currencyCode` to `USD`. `appliedAt` accepts a date-only string (`2026-07-01`) or a full ISO timestamp.",
        body: ApplicationCreateSchema,
        response: {
          201: ApplicationSchema,
          404: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { candidateId, ...rest } = request.body;

      const application = await prisma.application.create({
        data: {
          ...rest,
          candidate: { connect: { id: candidateId, deletedAt: null } },
        },
      });

      return reply.code(201).send(application);
    },
  );

  /**
   * GET /api/applications  —  the cross-entity search.
   *
   * One `search` term matches, in a SINGLE SQL statement:
   *   - the application's own jobTitle, company, source, notes
   *   - the parent candidate's name, email, location
   *
   * Prisma compiles the nested `candidate: { ... }` filters inside the OR array
   * into LEFT JOINs against Candidate, producing one query of the shape:
   *
   *   SELECT ... FROM "Application"
   *   LEFT JOIN "Candidate" AS j1 ON j1.id = "Application"."candidateId"
   *   ... (one alias per nested filter) ...
   *   WHERE (j1."deletedAt" IS NULL)
   *     AND "status" = $1 AND "appliedAt" >= $2 AND "appliedAt" < $3
   *     AND ("jobTitle" ILIKE $4 OR ... OR j2."name" ILIKE $8 OR j3."email" ILIKE $9 ...)
   *   ORDER BY "appliedAt" DESC LIMIT $n OFFSET $n
   *
   * Nothing is fetched into Node and filtered there; every predicate is pushed
   * into Postgres, and every value is a bound parameter (no string concatenation,
   * so no SQL injection). Brief section 6.2.
   *
   * `candidate: { deletedAt: null }` sits at the TOP level, not inside the OR, so
   * it is AND-ed around the whole search group — a search match can never surface
   * an application belonging to a soft-deleted candidate.
   */
  app.get(
    "/applications",
    {
      schema: {
        tags: ["Applications"],
        summary: "List applications (cross-entity search)",
        description:
          "One `search` term matches the application's own `jobTitle`, `company`, `source` and `notes` **and** the parent candidate's `name`, `email` and `location` — in a single SQL statement with JOINs, case-insensitively. " +
          "Filter by `status` and by an `appliedFrom`/`appliedTo` date range; `appliedTo` is inclusive of the whole day. " +
          "Empty values (`?status=`, `?appliedFrom=`) mean *no filter*, not *invalid*. " +
          "Applications belonging to a soft-deleted candidate never appear. Each row embeds its candidate.",
        querystring: ApplicationListQuerySchema,
        response: { 200: ApplicationListResponseSchema },
      },
    },
    async (request) => {
      const { page, pageSize, search, status, appliedFrom, appliedTo } =
        request.query;

      // `appliedTo` comes from an <input type="date">, i.e. midnight of that day.
      // A naive `lte` would exclude an application submitted at 09:00 that very
      // day. Treat the filter as inclusive of the whole day instead.
      const appliedBefore = appliedTo
        ? new Date(appliedTo.getTime() + 24 * 60 * 60 * 1000)
        : undefined;

      // Built once, shared by findMany and count so `total` describes the same
      // result set as `data`. Typed explicitly — no `any`.
      const where: Prisma.ApplicationWhereInput = {
        candidate: { deletedAt: null },
        ...(status ? { status } : {}),
        ...(appliedFrom || appliedBefore
          ? {
              appliedAt: {
                ...(appliedFrom ? { gte: appliedFrom } : {}),
                ...(appliedBefore ? { lt: appliedBefore } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                // the application's own columns
                { jobTitle: { contains: search, mode: "insensitive" } },
                { company: { contains: search, mode: "insensitive" } },
                { source: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                // ...and the parent candidate's, via the relation (-> JOIN)
                {
                  candidate: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  candidate: {
                    email: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  candidate: {
                    location: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      };

      const [data, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            candidate: { select: { id: true, name: true, email: true } },
          },
          orderBy: { appliedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.application.count({ where }),
      ]);

      return { data, total, page, pageSize };
    },
  );

  /**
   * GET /api/applications/:id — includes the parent candidate's id/name/email
   * so the detail page can link back without a second request.
   */
  app.get(
    "/applications/:id",
    {
      schema: {
        tags: ["Applications"],
        summary: "Get an application, including its parent candidate",
        description:
          "Embeds the candidate's `id`, `name` and `email` so the detail page can link back without a second request.",
        params: IdParamsSchema,
        response: {
          200: ApplicationDetailSchema,
          404: ApiErrorSchema,
        },
      },
    },
    async (request) => {
      const application = await prisma.application.findFirst({
        where: { id: request.params.id, candidate: { deletedAt: null } },
        include: {
          candidate: { select: { id: true, name: true, email: true } },
        },
      });

      if (!application) throw notFound("Application not found");

      return application;
    },
  );

  /**
   * PATCH /api/applications/:id
   *
   * All fields editable, including `candidateId` — reassigning an application to
   * a different candidate goes through the same guarded `connect`, so you cannot
   * move it onto a soft-deleted or nonexistent candidate.
   *
   * The `where` carries the relation filter, so patching an application whose own
   * candidate is soft-deleted matches no row -> P2025 -> 404.
   */
  app.patch(
    "/applications/:id",
    {
      schema: {
        tags: ["Applications"],
        summary: "Update an application",
        description:
          "Every field optional, including `candidateId` — reassigning to a nonexistent or soft-deleted candidate returns 404. **Omit a key** to leave that column untouched; **send `\"\"` or `null`** to clear it.",
        params: IdParamsSchema,
        body: ApplicationUpdateSchema,
        response: {
          200: ApplicationSchema,
          404: ApiErrorSchema,
        },
      },
    },
    async (request) => {
      const { candidateId, ...rest } = request.body;

      return prisma.application.update({
        where: { id: request.params.id, candidate: { deletedAt: null } },
        data: {
          ...rest,
          ...(candidateId
            ? { candidate: { connect: { id: candidateId, deletedAt: null } } }
            : {}),
        },
      });
    },
  );

  /**
   * DELETE /api/applications/:id
   *
   * Hard delete — the brief permits either, and applications have no
   * "referenced elsewhere" concern that Candidates do (see decisions.md).
   */
  app.delete(
    "/applications/:id",
    {
      schema: {
        tags: ["Applications"],
        summary: "Delete an application (hard delete)",
        description:
          "The row is removed. Unlike Candidates, Applications are not soft-deleted — the brief permits either.",
        params: IdParamsSchema,
        response: {
          204: z.null(),
          404: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      await prisma.application.delete({
        where: { id: request.params.id, candidate: { deletedAt: null } },
      });

      return reply.code(204).send(null);
    },
  );
};
