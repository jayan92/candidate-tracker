import {
  applicationStatusValues,
  type ApplicationStatus,
} from "@candidate-tracker/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FilterBar } from "../components/FilterBar";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useApplicationsList } from "../hooks/useApplications";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatDate } from "../lib/format";

const PAGE_SIZE = 20;

const parsePage = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

/** An unrecognised ?status= in the URL means "no filter", never a 400. */
const parseStatus = (raw: string | null): ApplicationStatus | "" =>
  applicationStatusValues.find((status) => status === raw) ?? "";

const headerClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
const cellClass = "px-4 py-3 text-sm text-slate-700";

const TableSkeleton = () => (
  <tbody>
    {[0, 1, 2, 3, 4].map((row) => (
      <tr key={row} className="border-t border-slate-100">
        {[0, 1, 2, 3, 4].map((cell) => (
          <td key={cell} className="px-4 py-3">
            <Skeleton className="h-4 w-3/4" />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

export const ApplicationsList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const status = parseStatus(searchParams.get("status"));
  const appliedFrom = searchParams.get("appliedFrom") ?? "";
  const appliedTo = searchParams.get("appliedTo") ?? "";
  const page = parsePage(searchParams.get("page"));

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);

  // Any filter change resets to page 1 — page 2 of the old result set is
  // meaningless against a new one.
  const setFilter = (key: string, value: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  };

  useEffect(() => {
    if (debouncedSearch === search) return;

    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (debouncedSearch) next.set("search", debouncedSearch);
        else next.delete("search");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, search, setSearchParams]);

  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useApplicationsList({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      appliedFrom: appliedFrom || undefined,
      appliedTo: appliedTo || undefined,
    });

  const hasActiveFilters = Boolean(
    search || status || appliedFrom || appliedTo,
  );

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const goToPage = (nextPage: number) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("page", String(nextPage));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Applications</h1>
        <Link
          to="/applications/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add application
        </Link>
      </div>

      <div className="space-y-4">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          label="Search applications"
          placeholder="Search job title, company, source, notes, or candidate"
        />
        <FilterBar
          status={status}
          appliedFrom={appliedFrom}
          appliedTo={appliedTo}
          onStatusChange={(value) => setFilter("status", value)}
          onAppliedFromChange={(value) => setFilter("appliedFrom", value)}
          onAppliedToChange={(value) => setFilter("appliedTo", value)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !isPending && data.total === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? "No applications match your filters"
              : "No applications yet"
          }
          description={
            hasActiveFilters
              ? "Try a different search term, status, or date range."
              : "Add your first application to get started."
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/applications/new"
                className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add application
              </Link>
            )
          }
        />
      ) : !isPending && data.data.length === 0 ? (
        <EmptyState
          title="No applications on this page"
          description={`There are only ${data.total} matching applications.`}
          action={
            <button
              type="button"
              onClick={() => goToPage(1)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Back to first page
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={headerClass}>Job title</th>
                  <th className={headerClass}>Company</th>
                  <th className={headerClass}>Candidate</th>
                  <th className={headerClass}>Status</th>
                  <th className={headerClass}>Applied</th>
                </tr>
              </thead>

              {isPending ? (
                <TableSkeleton />
              ) : (
                <tbody
                  className={isPlaceholderData ? "opacity-50 transition" : ""}
                >
                  {data.data.map((application) => (
                    <tr
                      key={application.id}
                      onClick={() => navigate(`/applications/${application.id}`)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className={`${cellClass} font-medium text-slate-900`}>
                        <Link
                          to={`/applications/${application.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:underline focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                          {application.jobTitle}
                        </Link>
                      </td>
                      <td className={cellClass}>{application.company}</td>
                      <td className={cellClass}>
                        <Link
                          to={`/candidates/${application.candidate.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                          {application.candidate.name}
                        </Link>
                      </td>
                      <td className={cellClass}>
                        <StatusBadge status={application.status} />
                      </td>
                      <td className={`${cellClass} tabular-nums`}>
                        {formatDate(application.appliedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>

          {!isPending && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={goToPage}
            />
          )}
        </div>
      )}
    </div>
  );
};
