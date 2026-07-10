import type { ApplicationListParams } from "./applications";
import type { CandidateListParams } from "./candidates";

export const queryKeys = {
  dashboard: ["dashboard"] as const,

  candidates: {
    all: ["candidates"] as const,
    list: (params: CandidateListParams) =>
      ["candidates", "list", params] as const,
    detail: (id: string) => ["candidates", "detail", id] as const,
  },

  applications: {
    all: ["applications"] as const,
    list: (params: ApplicationListParams) =>
      ["applications", "list", params] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
} as const;
