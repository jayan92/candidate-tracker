import type {
  Application,
  ApplicationCreateInput,
  ApplicationDetail,
  ApplicationListResponse,
  ApplicationStatus,
  ApplicationUpdateInput,
} from "@candidate-tracker/shared";

import { buildQuery, requestJson, requestVoid } from "./client";

export type ApplicationListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ApplicationStatus | "";
  appliedFrom?: string;
  appliedTo?: string;
};

export const listApplications = (params: ApplicationListParams = {}) =>
  requestJson<ApplicationListResponse>(`/applications${buildQuery(params)}`);

export const getApplication = (id: string) =>
  requestJson<ApplicationDetail>(`/applications/${id}`);

export const createApplication = (input: ApplicationCreateInput) =>
  requestJson<Application>("/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateApplication = (id: string, input: ApplicationUpdateInput) =>
  requestJson<Application>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

/** Hard delete — returns 204. */
export const deleteApplication = (id: string) =>
  requestVoid(`/applications/${id}`, { method: "DELETE" });
