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
};
