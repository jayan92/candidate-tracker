import { z } from "zod";
import {
  isoDateTime,
  optionalTrimmedString,
  paginated,
  PaginationQuerySchema,
} from "./common";
import { ApplicationSchema } from "./application";

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
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const CandidateListQuerySchema = PaginationQuerySchema.extend({
  search: optionalTrimmedString,
});
export type CandidateListQuery = z.infer<typeof CandidateListQuerySchema>;

export const CandidateListResponseSchema = paginated(CandidateSchema);
export type CandidateListResponse = z.infer<typeof CandidateListResponseSchema>;

export const CandidateDetailSchema = CandidateSchema.extend({
  applications: z.array(ApplicationSchema),
});
export type CandidateDetail = z.infer<typeof CandidateDetailSchema>;
