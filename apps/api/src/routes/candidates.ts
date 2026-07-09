import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Prisma } from "@prisma/client";
import {
  ApiErrorSchema,
  CandidateCreateSchema,
  CandidateDetailSchema,
  CandidateListQuerySchema,
  CandidateListResponseSchema,
  CandidateSchema,
  CandidateUpdateSchema,
} from "@candidate-tracker/shared";

import { prisma } from "../lib/prisma";
import { notFound } from "../lib/http-errors";

const IdParamsSchema = z.object({ id: z.string().uuid() });

export const candidateRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/candidates",
    {
      schema: {
        body: CandidateCreateSchema,
        response: {
          201: CandidateSchema,
          409: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const candidate = await prisma.candidate.create({ data: request.body });
      return reply.code(201).send(candidate);
    },
  );

  app.get(
    "/candidates",
    {
      schema: {
        querystring: CandidateListQuerySchema,
        response: { 200: CandidateListResponseSchema },
      },
    },
    async (request) => {
      const { page, pageSize, search } = request.query;

      const where: Prisma.CandidateWhereInput = {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [data, total] = await Promise.all([
        prisma.candidate.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.candidate.count({ where }),
      ]);

      return { data, total, page, pageSize };
    },
  );

  app.get(
    "/candidates/:id",
    {
      schema: {
        params: IdParamsSchema,
        response: {
          200: CandidateDetailSchema,
          404: ApiErrorSchema,
        },
      },
    },
    async (request) => {
      const candidate = await prisma.candidate.findFirst({
        where: { id: request.params.id, deletedAt: null },
        include: { applications: { orderBy: { appliedAt: "desc" } } },
      });

      if (!candidate) throw notFound("Candidate not found");

      return candidate;
    },
  );

  /**
   * PATCH /api/candidates/:id
   *
   * Every field optional (CandidateUpdateSchema is CandidateCreateSchema.partial()).
   * Field omitted        -> undefined -> Prisma leaves the column untouched.
   * Field sent as ""/null -> null      -> Prisma sets the column to NULL.
   *
   * `where` carries the soft-delete filter alongside the id, so one UPDATE
   * statement covers "wrong id" and "already deleted" alike: no row matches,
   * Prisma raises P2025, and the global handler returns 404. No read-then-write
   * race, no not-found branch in this route.
   *
   * Changing email to one already taken raises P2002 -> 409, also handled globally.
   */
  app.patch(
    "/candidates/:id",
    {
      schema: {
        params: IdParamsSchema,
        body: CandidateUpdateSchema,
        response: {
          200: CandidateSchema,
          404: ApiErrorSchema,
          409: ApiErrorSchema,
        },
      },
    },
    async (request) => {
      return prisma.candidate.update({
        where: { id: request.params.id, deletedAt: null },
        data: request.body,
      });
    },
  );

  /**
   * DELETE /api/candidates/:id
   *
   * Soft delete: stamps `deletedAt`, never removes the row. The candidate then
   * disappears from every list, detail and search query, and their applications
   * disappear from the Applications list too (see decisions.md).
   *
   * Deleting an already-deleted candidate matches no row -> P2025 -> 404, rather
   * than silently succeeding twice.
   */
  app.delete(
    "/candidates/:id",
    {
      schema: {
        params: IdParamsSchema,
        // 204 must be declared: the type provider narrows reply.code() to the
        // codes listed here. z.null() types the body; Fastify emits none for 204.
        response: {
          204: z.null(),
          404: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      await prisma.candidate.update({
        where: { id: request.params.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      return reply.code(204).send(null);
    },
  );
};
