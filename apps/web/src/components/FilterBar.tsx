import {
  applicationStatusValues,
  type ApplicationStatus,
} from "@candidate-tracker/shared";

import { statusLabels } from "../lib/status";

type FilterBarProps = {
  status: ApplicationStatus | "";
  appliedFrom: string;
  appliedTo: string;
  onStatusChange: (status: ApplicationStatus | "") => void;
  onAppliedFromChange: (date: string) => void;
  onAppliedToChange: (date: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

const controlClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "block text-xs font-medium text-slate-600";

const isStatus = (value: string): value is ApplicationStatus =>
  applicationStatusValues.some((status) => status === value);

export const FilterBar = ({
  status,
  appliedFrom,
  appliedTo,
  onStatusChange,
  onAppliedFromChange,
  onAppliedToChange,
  onClear,
  hasActiveFilters,
}: FilterBarProps) => (
  <div className="flex flex-wrap items-end gap-4">
    <div>
      <label htmlFor="status" className={labelClass}>
        Status
      </label>
      <select
        id="status"
        value={status}
        onChange={(event) =>
          onStatusChange(isStatus(event.target.value) ? event.target.value : "")
        }
        className={`mt-1 ${controlClass}`}
      >
        <option value="">All statuses</option>
        {applicationStatusValues.map((value) => (
          <option key={value} value={value}>
            {statusLabels[value]}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label htmlFor="appliedFrom" className={labelClass}>
        Applied from
      </label>
      <input
        id="appliedFrom"
        type="date"
        value={appliedFrom}
        max={appliedTo || undefined}
        onChange={(event) => onAppliedFromChange(event.target.value)}
        className={`mt-1 ${controlClass}`}
      />
    </div>

    <div>
      <label htmlFor="appliedTo" className={labelClass}>
        Applied to
      </label>
      <input
        id="appliedTo"
        type="date"
        value={appliedTo}
        min={appliedFrom || undefined}
        onChange={(event) => onAppliedToChange(event.target.value)}
        className={`mt-1 ${controlClass}`}
      />
    </div>

    {hasActiveFilters && (
      <button
        type="button"
        onClick={onClear}
        className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 underline hover:text-slate-900"
      >
        Clear filters
      </button>
    )}
  </div>
);
