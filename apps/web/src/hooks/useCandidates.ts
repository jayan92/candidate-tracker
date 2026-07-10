import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Candidate,
  CandidateCreateInput,
  CandidateUpdateInput,
} from "@candidate-tracker/shared";

import {
  createCandidate,
  deleteCandidate,
  getCandidate,
  listCandidates,
  updateCandidate,
  type CandidateListParams,
} from "../api/candidates";
import type { ApiRequestError } from "../api/client";
import { queryKeys } from "../api/queryKeys";

export const useCandidatesList = (params: CandidateListParams) =>
  useQuery({
    queryKey: queryKeys.candidates.list(params),
    queryFn: () => listCandidates(params),
    placeholderData: keepPreviousData,
  });

export const useCandidate = (id: string) =>
  useQuery({
    queryKey: queryKeys.candidates.detail(id),
    queryFn: () => getCandidate(id),
    enabled: Boolean(id),
  });

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation<Candidate, ApiRequestError, CandidateCreateInput>({
    mutationFn: createCandidate,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.candidates.all,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useUpdateCandidate = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<Candidate, ApiRequestError, CandidateUpdateInput>({
    mutationFn: (input) => updateCandidate(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.candidates.all,
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.applications.all,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiRequestError, string>({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.candidates.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.applications.all,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};
