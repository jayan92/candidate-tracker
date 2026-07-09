import { z } from "zod";
import { isoDateTime, optionalTrimmedString } from "./common";

export const applicationStatusValues = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export const ApplicationStatusSchema = z.enum(applicationStatusValues);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const currencyCodes = ["USD", "EUR", "LKR"] as const;

export const CurrencyCodeSchema = z.enum(currencyCodes);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const ApplicationCreateSchema = z.object({
  candidateId: z.string().uuid("Must be a valid candidate id"),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  company: z.string().trim().min(1, "Company is required"),
  status: ApplicationStatusSchema.default("applied"),
  appliedAt: z.coerce.date(),
  salaryExpectation: z.coerce
    .number()
    .int("Must be a whole number")
    .positive()
    .optional(),
  currencyCode: CurrencyCodeSchema.default("USD"),
  source: optionalTrimmedString,
  notes: optionalTrimmedString,
});
export type ApplicationCreateInput = z.infer<typeof ApplicationCreateSchema>;

export const ApplicationUpdateSchema = ApplicationCreateSchema.partial();
export type ApplicationUpdateInput = z.infer<typeof ApplicationUpdateSchema>;

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  jobTitle: z.string(),
  company: z.string(),
  status: ApplicationStatusSchema,
  appliedAt: isoDateTime,
  salaryExpectation: z.number().int().nullable(),
  currencyCode: CurrencyCodeSchema,
  source: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Application = z.infer<typeof ApplicationSchema>;
