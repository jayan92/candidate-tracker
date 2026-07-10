import type { ApplicationDetail } from "@candidate-tracker/shared";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { StatusDoughnut } from "../components/StatusDoughnut";
import { useDashboard } from "../hooks/useDashboard";
import { formatDate, formatPercent } from "../lib/format";

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-[104px]" />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-[320px]" />
      <Skeleton className="h-[320px]" />
    </div>
  </div>
);

const LatestApplicationRow = ({
  application,
}: {
  application: ApplicationDetail;
}) => (
  <li>
    <Link
      to={`/applications/${application.id}`}
      className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {application.jobTitle}
        </p>
        <p className="truncate text-sm text-slate-600">
          {application.candidate.name} · {application.company}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={application.status} />
        <span className="text-xs tabular-nums text-slate-500">
          {formatDate(application.appliedAt)}
        </span>
      </div>
    </Link>
  </li>
);

export const Dashboard = () => {
  const { data, isPending, isError, error, refetch } = useDashboard();

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            to="/candidates"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View candidates
          </Link>
          <Link
            to="/applications"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View applications
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total candidates" value={data.totalCandidates} />
        <StatCard label="Total applications" value={data.totalApplications} />
        <StatCard label="Hired this month" value={data.hiredThisMonth} />
        <StatCard
          label="Rejection rate"
          value={formatPercent(data.rejectionRate)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Applications by status
          </h2>
          <div className="mt-6">
            {data.totalApplications === 0 ? (
              <EmptyState
                title="No applications yet"
                description="Status distribution will appear once applications are added."
              />
            ) : (
              <StatusDoughnut slices={data.applicationsByStatus} />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Latest applications
            </h2>
            <Link
              to="/applications"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-4">
            {data.latestApplications.length === 0 ? (
              <EmptyState
                title="No applications yet"
                description="New applications will show up here."
              />
            ) : (
              <ul className="-mx-3 divide-y divide-slate-100">
                {data.latestApplications.map((application) => (
                  <LatestApplicationRow
                    key={application.id}
                    application={application}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
