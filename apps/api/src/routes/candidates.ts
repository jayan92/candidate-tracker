import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Prisma } from "@prisma/client";
import {
  CandidateCreateSchema,
  CandidateListQuerySchema,
  CandidateListResponseSchema,
  CandidateSchema,
  CandidateDetailSchema,
} from "@candidate-tracker/shared";

import { prisma } from "../lib/prisma";

/** :id path param — a UUID. Shared by GET/:id, PATCH, DELETE. */
const IdParamsSchema = z.object({ id: z.string().uuid() });

/** Standard error body. Phase 1d will unify this with the global handler. */
const MessageSchema = z.object({ message: z.string() });

export const candidateRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/candidates",
    {
      schema: {
        body: CandidateCreateSchema,
        response: {
          201: CandidateSchema,
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      // TEMPORARY — deleted in Phase 1d when the global setErrorHandler
      // takes over. Kept here so the problem it solves is visible.
      const existing = await prisma.candidate.findUnique({
        where: { email: request.body.email },
      });

      if (existing) {
        return reply
          .code(409)
          .send({ message: "A candidate with this email already exists" });
      }

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

      // Built once, used by BOTH queries below so the count always
      // matches the filter. Typed explicitly - no `any`.
      const where: Prisma.CandidateWhereInput = {
        deletedAt: null, // soft-deleted candidates never appear
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
          404: MessageSchema,
        },
      },
    },
    async (request, reply) => {
      const candidate = await prisma.candidate.findFirst({
        where: { id: request.params.id, deletedAt: null },
        include: { applications: { orderBy: { appliedAt: "desc" } } },
      });

      // Not an exception — findFirst returning null is a normal result,
      // so this 404 stays here even after 1d's global error handler.
      if (!candidate) {
        return reply.code(404).send({ message: "Candidate not found" });
      }

      return candidate;
    },
  );
};
