import type { ApplicationStatus } from "@candidate-tracker/shared";

import { statusColors, statusLabels } from "../lib/status";

export const StatusBadge = ({ status }: { status: ApplicationStatus }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-700">
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: statusColors[status] }}
    />
    {statusLabels[status]}
  </span>
);
