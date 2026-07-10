import type { Dashboard } from "@candidate-tracker/shared";

import { requestJson } from "./client";

export const getDashboard = () => requestJson<Dashboard>("/dashboard");
