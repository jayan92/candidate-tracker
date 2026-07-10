import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Prisma } from "@prisma/client";
import {
  applicationStatusValues,
  DashboardSchema,
} from "@candidate-tracker/shared";

import { prisma } from "../lib/prisma";

/** Applications belonging to a soft-deleted candidate are excluded everywhere. */
const ACTIVE_APPLICATIONS: Prisma.ApplicationWhereInput = {
  candidate: { deletedAt: null },
};

/**
 * First instant of the current calendar month, and of the next one, in UTC.
 * Used as a half-open range [start, next) so the boundary day is counted once.
 */
const currentMonthRange = (now: Date): { start: Date; next: Date } => ({
  start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  next: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
});

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /api/dashboard
   *
   * Six metrics, six database aggregations, issued concurrently. Only scalars
   * and a five-row slice ever reach Node — no metric is derived by pulling rows
   * into JavaScript and counting them (brief section 5.1 / rubric "Dashboard").
   */
  app.get(
    "/dashboard",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "All six dashboard metrics",
        description:
          "Every metric is aggregated in the database (Prisma `count` / `groupBy`), never derived from a full-list fetch. " +
          "`applicationsByStatus` always contains all six statuses in canonical order, including those with a count of 0. " +
          "`rejectionRate` is a percentage (0-100) to one decimal place. " +
          "`hiredThisMonth` counts applications with status `hired` whose `appliedAt` falls in the current calendar month — there is no `hiredAt` column (see decisions.md). " +
          "Soft-deleted candidates and their applications are excluded from every metric.",
        response: { 200: DashboardSchema },
      },
    },
    async () => {
      const { start, next } = currentMonthRange(new Date());

      const [
        totalCandidates,
        totalApplications,
        statusGroups,
        hiredThisMonth,
        rejectedCount,
        latestApplications,
      ] = await Promise.all([
        // SELECT count(*) FROM "Candidate" WHERE "deletedAt" IS NULL
        prisma.candidate.count({ where: { deletedAt: null } }),

        // SELECT count(*) FROM "Application" JOIN "Candidate" ... WHERE deletedAt IS NULL
        prisma.application.count({ where: ACTIVE_APPLICATIONS }),

        // SELECT "status", count(*) FROM "Application" ... GROUP BY "status"
        prisma.application.groupBy({
          by: ["status"],
          where: ACTIVE_APPLICATIONS,
          _count: { _all: true },
        }),

        // Hired, applied within the current calendar month. See decisions.md:
        // there is no `hiredAt` column, so `appliedAt` stands in for it.
        prisma.application.count({
          where: {
            ...ACTIVE_APPLICATIONS,
            status: "hired",
            appliedAt: { gte: start, lt: next },
          },
        }),

        prisma.application.count({
          where: { ...ACTIVE_APPLICATIONS, status: "rejected" },
        }),

        prisma.application.findMany({
          where: ACTIVE_APPLICATIONS,
          include: {
            candidate: { select: { id: true, name: true, email: true } },
          },
          orderBy: { appliedAt: "desc" },
          take: 5,
        }),
      ]);

      // groupBy omits statuses with no rows. Backfill so all six always appear,
      // in the canonical order, and the chart never loses a slice.
      const counts = new Map(
        statusGroups.map((g) => [g.status, g._count._all]),
      );
      const applicationsByStatus = applicationStatusValues.map((status) => ({
        status,
        count: counts.get(status) ?? 0,
      }));

      const rejectionRate =
        totalApplications === 0
          ? 0
          : Math.round((rejectedCount / totalApplications) * 1000) / 10;

      return {
        totalCandidates,
        totalApplications,
        applicationsByStatus,
        hiredThisMonth,
        rejectionRate,
        latestApplications,
      };
    },
  );
};
