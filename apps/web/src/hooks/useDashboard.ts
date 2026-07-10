import { useQuery } from "@tanstack/react-query";

import { getDashboard } from "../api/dashboard";
import { queryKeys } from "../api/queryKeys";

export const useDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboard,
  });
