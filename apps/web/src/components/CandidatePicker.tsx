import { useState } from "react";

import { useCandidatesList } from "../hooks/useCandidates";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { fieldClass, fieldErrorClass } from "./FormField";

export type PickedCandidate = { id: string; name: string; email: string };

type CandidatePickerProps = {
  selected: PickedCandidate | null;
  onSelect: (candidate: PickedCandidate | null) => void;
  error?: string;
};

export const CandidatePicker = ({
  selected,
  onSelect,
  error,
}: CandidatePickerProps) => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const { data, isFetching } = useCandidatesList({
    page: 1,
    pageSize: 5,
    search: debouncedQuery || undefined,
  });

  if (selected) {
    return (
      <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {selected.name}
          </p>
          <p className="truncate text-xs text-slate-600">{selected.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        id="candidateId"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search candidates by name, email, location or phone"
        aria-describedby={error ? "candidateId-error" : undefined}
        className={error ? fieldErrorClass : fieldClass}
      />

      <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
        {isFetching && !data ? (
          <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
        ) : !data || data.data.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-500">
            No candidates found.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => onSelect(candidate)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {candidate.name}
                  </span>
                  <span className="text-xs text-slate-600">
                    {candidate.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
