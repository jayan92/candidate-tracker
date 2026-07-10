import type { Application } from "@candidate-tracker/shared";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiRequestError } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useCandidate, useDeleteCandidate } from "../hooks/useCandidates";
import { formatDate } from "../lib/format";

const headerClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
const cellClass = "px-4 py-3 text-sm text-slate-700";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="mt-1 text-sm text-slate-900">{children}</dd>
  </div>
);

const DetailSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-[220px]" />
    <Skeleton className="h-[240px]" />
  </div>
);

const ApplicationRow = ({ application }: { application: Application }) => {
  const navigate = useNavigate();

  return (
    <tr
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
        <StatusBadge status={application.status} />
      </td>
      <td className={`${cellClass} tabular-nums`}>
        {formatDate(application.appliedAt)}
      </td>
    </tr>
  );
};

export const CandidateDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data, isPending, isError, error, refetch } = useCandidate(id);
  const deleteCandidate = useDeleteCandidate();

  if (isPending) return <DetailSkeleton />;

  if (isError) {
    const notFound =
      error instanceof ApiRequestError && error.statusCode === 404;

    return notFound ? (
      <EmptyState
        title="Candidate not found"
        description="This candidate does not exist, or has been deleted."
        action={
          <Link
            to="/candidates"
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to candidates
          </Link>
        }
      />
    ) : (
      <ErrorState error={error} onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/candidates"
        className="inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to candidates
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{data.email}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/candidates/${data.id}/edit`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Name">{data.name}</Field>
          <Field label="Email">
            <a
              href={`mailto:${data.email}`}
              className="text-blue-700 hover:underline"
            >
              {data.email}
            </a>
          </Field>
          <Field label="Phone">{data.phone ?? "—"}</Field>
          <Field label="Location">{data.location ?? "—"}</Field>
          <Field label="LinkedIn">
            {data.linkedinUrl ? (
              <a
                href={data.linkedinUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="break-all text-blue-700 hover:underline"
              >
                {data.linkedinUrl}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Added">{formatDate(data.createdAt)}</Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <span className="whitespace-pre-wrap">{data.notes ?? "—"}</span>
            </Field>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Applications{" "}
            <span className="ml-1 text-sm font-normal text-slate-500">
              ({data.applications.length})
            </span>
          </h2>
          <Link
            to={`/applications/new?candidateId=${data.id}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Add application
          </Link>
        </div>

        {data.applications.length === 0 ? (
          <div className="p-6 pt-0">
            <EmptyState
              title="No applications yet"
              description="This candidate has not applied to any roles."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={headerClass}>Job title</th>
                  <th className={headerClass}>Company</th>
                  <th className={headerClass}>Status</th>
                  <th className={headerClass}>Applied</th>
                </tr>
              </thead>
              <tbody>
                {data.applications.map((application) => (
                  <ApplicationRow
                    key={application.id}
                    application={application}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${data.name}?`}
          description={`This removes the candidate and hides their ${data.applications.length} application(s) from every list. This cannot be undone from the app.`}
          confirmLabel="Delete candidate"
          isPending={deleteCandidate.isPending}
          error={deleteCandidate.error}
          onCancel={() => {
            deleteCandidate.reset();
            setConfirmingDelete(false);
          }}
          onConfirm={() =>
            deleteCandidate.mutate(data.id, {
              onSuccess: () => navigate("/candidates"),
            })
          }
        />
      )}
    </div>
  );
};
