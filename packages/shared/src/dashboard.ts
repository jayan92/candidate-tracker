import { z } from "zod";

import {
  ApplicationDetailSchema,
  ApplicationStatusSchema,
} from "./application";

/**
 * GET /api/dashboard — every metric is aggregated in the database
 * (Prisma `count` / `groupBy`), never derived from a full-list fetch.
 */
export const DashboardSchema = z.object({
  totalCandidates: z.number().int(),
  totalApplications: z.number().int(),

  /**
   * Always contains all six statuses, including those with a count of 0.
   * Prisma's `groupBy` omits empty groups, so the route backfills them —
   * otherwise the doughnut chart would silently lose slices.
   */
  applicationsByStatus: z.array(
    z.object({
      status: ApplicationStatusSchema,
      count: z.number().int(),
    }),
  ),

  hiredThisMonth: z.number().int(),

  /** rejected / total, as a percentage (0-100), rounded to one decimal place. */
  rejectionRate: z.number(),

  /** The five most recent applications by appliedAt, each with its candidate. */
  latestApplications: z.array(ApplicationDetailSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
