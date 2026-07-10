import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { Skeleton } from "../components/Skeleton";
import { useCandidatesList } from "../hooks/useCandidates";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const PAGE_SIZE = 10;

const parsePage = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const headerClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
const cellClass = "px-4 py-3 text-sm text-slate-700";

const TableSkeleton = () => (
  <tbody>
    {[0, 1, 2, 3, 4].map((row) => (
      <tr key={row} className="border-t border-slate-100">
        {[0, 1, 2, 3].map((cell) => (
          <td key={cell} className="px-4 py-3">
            <Skeleton className="h-4 w-3/4" />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

export const CandidatesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const page = parsePage(searchParams.get("page"));

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);

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
    useCandidatesList({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
    });

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
        <h1 className="text-2xl font-semibold text-slate-900">Candidates</h1>
        <Link
          to="/candidates/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add candidate
        </Link>
      </div>

      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        label="Search candidates"
        placeholder="Search by name, email, location or phone"
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !isPending && data.total === 0 ? (
        <EmptyState
          title={
            search ? "No candidates match your search" : "No candidates yet"
          }
          description={
            search
              ? `Nothing found for "${search}". Try a different name, email, location or phone.`
              : "Add your first candidate to get started."
          }
          action={
            search ? undefined : (
              <Link
                to="/candidates/new"
                className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add candidate
              </Link>
            )
          }
        />
      ) : !isPending && data.data.length === 0 ? (
        <EmptyState
          title="No candidates on this page"
          description={`There are only ${data.total} candidates.`}
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
                  <th className={headerClass}>Name</th>
                  <th className={headerClass}>Email</th>
                  <th className={headerClass}>Phone</th>
                  <th className={headerClass}>Location</th>
                </tr>
              </thead>

              {isPending ? (
                <TableSkeleton />
              ) : (
                <tbody
                  className={isPlaceholderData ? "opacity-50 transition" : ""}
                >
                  {data.data.map((candidate) => (
                    <tr
                      key={candidate.id}
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className={`${cellClass} font-medium text-slate-900`}>
                        <Link
                          to={`/candidates/${candidate.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:underline focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                          {candidate.name}
                        </Link>
                      </td>
                      <td className={cellClass}>{candidate.email}</td>
                      <td className={cellClass}>{candidate.phone ?? "—"}</td>
                      <td className={cellClass}>{candidate.location ?? "—"}</td>
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
