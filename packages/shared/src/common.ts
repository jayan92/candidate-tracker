import { z } from "zod";

/** Optional free-text input: trims, and treats "" as "not provided". */
export const optionalTrimmedString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/**
 * A timestamp on the way OUT of the API.
 *   input  side = Date   (what Prisma returns, so reply.send() accepts it)
 *   output side = string (ISO 8601, what the client actually receives)
 */
export const isoDateTime = z.date().transform((d) => d.toISOString());

/** Standard pagination query params. Query strings are always strings -> coerce. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/** Wraps any entity schema in the standard paginated envelope. */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
