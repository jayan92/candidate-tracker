import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Application,
  ApplicationCreateInput,
  ApplicationUpdateInput,
} from "@candidate-tracker/shared";

import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
  type ApplicationListParams,
} from "../api/applications";
import type { ApiRequestError } from "../api/client";
import { queryKeys } from "../api/queryKeys";

export const useApplicationsList = (params: ApplicationListParams) =>
  useQuery({
    queryKey: queryKeys.applications.list(params),
    queryFn: () => listApplications(params),
    placeholderData: keepPreviousData,
  });

export const useApplication = (id: string) =>
  useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: () => getApplication(id),
    enabled: Boolean(id),
  });

/** Candidate detail embeds the applications table, so it is invalidated too. */
const invalidateApplicationCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.candidates.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<Application, ApiRequestError, ApplicationCreateInput>({
    mutationFn: createApplication,
    onSuccess: () => invalidateApplicationCaches(queryClient),
  });
};

export const useUpdateApplication = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<Application, ApiRequestError, ApplicationUpdateInput>({
    mutationFn: (input) => updateApplication(id, input),
    onSuccess: () => invalidateApplicationCaches(queryClient),
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiRequestError, string>({
    mutationFn: deleteApplication,
    onSuccess: () => invalidateApplicationCaches(queryClient),
  });
};
