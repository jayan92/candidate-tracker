import type {
  Candidate,
  CandidateCreateInput,
  CandidateDetail,
  CandidateListResponse,
  CandidateUpdateInput,
} from "@candidate-tracker/shared";

import { buildQuery, requestJson, requestVoid } from "./client";

/** Client-side query params. Page/pageSize are optional; the API defaults them. */
export type CandidateListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export const listCandidates = (params: CandidateListParams = {}) =>
  requestJson<CandidateListResponse>(`/candidates${buildQuery(params)}`);

export const getCandidate = (id: string) =>
  requestJson<CandidateDetail>(`/candidates/${id}`);

export const createCandidate = (input: CandidateCreateInput) =>
  requestJson<Candidate>("/candidates", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateCandidate = (id: string, input: CandidateUpdateInput) =>
  requestJson<Candidate>(`/candidates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

/** Soft delete — the API sets deletedAt and returns 204. */
export const deleteCandidate = (id: string) =>
  requestVoid(`/candidates/${id}`, { method: "DELETE" });
