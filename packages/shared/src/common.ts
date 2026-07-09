import { z } from "zod";

export const optionalTrimmedString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const isoDateTime = z.date().transform((d) => d.toISOString());

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * A date arriving as a query-string parameter.
 * Absent or "" (a cleared date input) -> undefined; anything else is coerced to
 * a Date and validated. Without the "" branch, clearing a date filter in the UI
 * would send `?appliedFrom=` and be rejected as an invalid date.
 */
export const optionalQueryDate = z
  .union([z.literal(""), z.coerce.date()])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
