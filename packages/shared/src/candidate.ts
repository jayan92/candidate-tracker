import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const CandidateCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Must be a valid email"),
  phone: optionalTrimmedString,
  location: optionalTrimmedString,
  linkedinUrl: optionalTrimmedString.pipe(
    z.string().url("Must be a valid URL").optional(),
  ),
  notes: optionalTrimmedString,
});
export type CandidateCreateInput = z.infer<typeof CandidateCreateSchema>;

export const CandidateUpdateSchema = CandidateCreateSchema.partial();
export type CandidateUpdateInput = z.infer<typeof CandidateUpdateSchema>;

export const CandidateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type Candidate = z.infer<typeof CandidateSchema>;
