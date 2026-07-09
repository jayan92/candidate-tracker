import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  ApiErrorSchema,
  ApplicationCreateSchema,
  ApplicationDetailSchema,
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
   * GET /api/applications/:id — includes the parent candidate's id/name/email
   * so the detail page can link back without a second request.
   */
  app.get(
    "/applications/:id",
    {
      schema: {
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
