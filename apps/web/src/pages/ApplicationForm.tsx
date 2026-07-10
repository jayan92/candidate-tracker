import {
  applicationStatusValues,
  currencyCodes,
  type ApplicationCreateInput,
  type ApplicationDetail,
  type ApplicationStatus,
  type CurrencyCode,
} from "@candidate-tracker/shared";
import { useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { ApiRequestError } from "../api/client";
import {
  CandidatePicker,
  type PickedCandidate,
} from "../components/CandidatePicker";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { fieldClass, fieldErrorClass, FormField } from "../components/FormField";
import { Skeleton } from "../components/Skeleton";
import {
  useApplication,
  useCreateApplication,
  useDeleteApplication,
  useUpdateApplication,
} from "../hooks/useApplications";
import { useCandidate } from "../hooks/useCandidates";
import { nullable } from "../lib/form";
import { statusLabels } from "../lib/status";

type FormValues = {
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string;
  salaryExpectation: string;
  currencyCode: CurrencyCode;
  source: string;
  notes: string;
};

const emptyValues: FormValues = {
  jobTitle: "",
  company: "",
  status: "applied",
  appliedAt: "",
  salaryExpectation: "",
  currencyCode: "USD",
  source: "",
  notes: "",
};

const valuesFrom = (application: ApplicationDetail): FormValues => ({
  jobTitle: application.jobTitle,
  company: application.company,
  status: application.status,
  appliedAt: application.appliedAt.slice(0, 10),
  salaryExpectation: application.salaryExpectation?.toString() ?? "",
  currencyCode: application.currencyCode,
  source: application.source ?? "",
  notes: application.notes ?? "",
});

type FormProps = {
  applicationId: string | null;
  initialValues: FormValues;
  initialCandidate: PickedCandidate | null;
};

const Form = ({ applicationId, initialValues, initialCandidate }: FormProps) => {
  const navigate = useNavigate();
  const isEdit = applicationId !== null;

  const [values, setValues] = useState(initialValues);
  const [candidate, setCandidate] = useState(initialCandidate);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication(applicationId ?? "");
  const deleteApplication = useDeleteApplication();

  const mutation = isEdit ? updateApplication : createApplication;

  const serverErrors =
    mutation.error instanceof ApiRequestError ? mutation.error.fieldErrors : {};
  const errors = { ...serverErrors, ...clientErrors };

  const generalError =
    mutation.error instanceof ApiRequestError &&
    Object.keys(mutation.error.fieldErrors).length === 0
      ? mutation.error.message
      : null;

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    // Only the two the server cannot usefully report on are checked here.
    // An empty date would reach Zod as `undefined` and read as "Invalid date";
    // an empty candidateId would 400 without pointing at the picker.
    const nextClientErrors: Record<string, string> = {};
    if (!candidate) nextClientErrors.candidateId = "Select a candidate";
    if (!values.appliedAt) nextClientErrors.appliedAt = "Applied date is required";
    setClientErrors(nextClientErrors);
    if (Object.keys(nextClientErrors).length > 0 || !candidate) return;

    const payload: ApplicationCreateInput = {
      candidateId: candidate.id,
      jobTitle: values.jobTitle.trim(),
      company: values.company.trim(),
      status: values.status,
      appliedAt: new Date(values.appliedAt),
      currencyCode: values.currencyCode,
      source: nullable(values.source),
      notes: nullable(values.notes),
      // Omitted when blank: `salaryExpectation` is optional-but-not-nullable in
      // the shared schema, so there is no value that clears it. See decisions.md.
      ...(values.salaryExpectation.trim() === ""
        ? {}
        : { salaryExpectation: Number(values.salaryExpectation) }),
    };

    // The candidate the application now belongs to — on edit the picker may have
    // reassigned it, so this is the selected one, not the one we arrived with.
    const onSuccess = () => navigate(`/candidates/${candidate.id}`);

    if (isEdit) updateApplication.mutate(payload, { onSuccess });
    else createApplication.mutate(payload, { onSuccess });
  };

  const inputClass = (field: keyof FormValues | "candidateId") =>
    errors[field] ? fieldErrorClass : fieldClass;

  return (
    <div className="space-y-6">
      <Link
        to={candidate ? `/candidates/${candidate.id}` : "/applications"}
        className="inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        {candidate ? `← Back to ${candidate.name}` : "← Back to applications"}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {isEdit ? "Edit application" : "New application"}
        </h1>
        {isEdit && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>

      {generalError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {generalError}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-lg border border-slate-200 bg-white p-6"
      >
        <FormField
          id="candidateId"
          label="Candidate"
          required
          error={errors.candidateId}
        >
          <CandidatePicker
            selected={candidate}
            onSelect={(next) => {
              setCandidate(next);
              setClientErrors((previous) => {
                const remaining = { ...previous };
                delete remaining.candidateId;
                return remaining;
              });
            }}
            error={errors.candidateId}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="jobTitle"
            label="Job title"
            required
            error={errors.jobTitle}
          >
            <input
              id="jobTitle"
              value={values.jobTitle}
              onChange={(event) => set("jobTitle", event.target.value)}
              className={inputClass("jobTitle")}
            />
          </FormField>

          <FormField
            id="company"
            label="Company"
            required
            error={errors.company}
          >
            <input
              id="company"
              value={values.company}
              onChange={(event) => set("company", event.target.value)}
              className={inputClass("company")}
            />
          </FormField>

          <FormField id="status" label="Status" error={errors.status}>
            <select
              id="status"
              value={values.status}
              onChange={(event) =>
                set("status", event.target.value as ApplicationStatus)
              }
              className={inputClass("status")}
            >
              {applicationStatusValues.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="appliedAt"
            label="Applied date"
            required
            error={errors.appliedAt}
          >
            <input
              id="appliedAt"
              type="date"
              value={values.appliedAt}
              onChange={(event) => set("appliedAt", event.target.value)}
              className={inputClass("appliedAt")}
            />
          </FormField>

          <FormField
            id="salaryExpectation"
            label="Salary expectation"
            error={errors.salaryExpectation}
            hint={
              isEdit
                ? "Whole numbers only. Blank leaves the current value unchanged — it cannot be cleared."
                : "Whole numbers only."
            }
          >
            <input
              id="salaryExpectation"
              type="number"
              min="1"
              step="1"
              value={values.salaryExpectation}
              onChange={(event) => set("salaryExpectation", event.target.value)}
              className={inputClass("salaryExpectation")}
            />
          </FormField>

          <FormField
            id="currencyCode"
            label="Currency"
            error={errors.currencyCode}
          >
            <select
              id="currencyCode"
              value={values.currencyCode}
              onChange={(event) =>
                set("currencyCode", event.target.value as CurrencyCode)
              }
              className={inputClass("currencyCode")}
            >
              {currencyCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField id="source" label="Source" error={errors.source}>
          <input
            id="source"
            value={values.source}
            onChange={(event) => set("source", event.target.value)}
            placeholder="e.g. LinkedIn, referral, careers page"
            className={inputClass("source")}
          />
        </FormField>

        <FormField id="notes" label="Notes" error={errors.notes}>
          <textarea
            id="notes"
            rows={4}
            value={values.notes}
            onChange={(event) => set("notes", event.target.value)}
            className={inputClass("notes")}
          />
        </FormField>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create application"}
          </button>
          <Link
            to="/applications"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      {confirmingDelete && applicationId && (
        <ConfirmDialog
          title="Delete this application?"
          description={`${values.jobTitle} at ${values.company} will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete application"
          isPending={deleteApplication.isPending}
          error={deleteApplication.error}
          onCancel={() => {
            deleteApplication.reset();
            setConfirmingDelete(false);
          }}
          onConfirm={() =>
            deleteApplication.mutate(applicationId, {
              onSuccess: () => navigate("/applications"),
            })
          }
        />
      )}
    </div>
  );
};

const FormSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-8 w-56" />
    <Skeleton className="h-[520px]" />
  </div>
);

/** `/applications/new` — optionally pre-selecting a candidate via `?candidateId=`. */
const CreateApplication = () => {
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("candidateId") ?? "";

  const { data, isPending, isError } = useCandidate(candidateId);

  if (candidateId && isPending) return <FormSkeleton />;

  const initialCandidate =
    candidateId && data && !isError
      ? { id: data.id, name: data.name, email: data.email }
      : null;

  return (
    <Form
      applicationId={null}
      initialValues={emptyValues}
      initialCandidate={initialCandidate}
    />
  );
};

/** `/applications/:id` — the combined edit/detail view. */
const EditApplication = ({ id }: { id: string }) => {
  const { data, isPending, isError, error, refetch } = useApplication(id);

  if (isPending) return <FormSkeleton />;

  if (isError) {
    const notFound =
      error instanceof ApiRequestError && error.statusCode === 404;

    return notFound ? (
      <EmptyState
        title="Application not found"
        description="This application does not exist, or its candidate has been deleted."
        action={
          <Link
            to="/applications"
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to applications
          </Link>
        }
      />
    ) : (
      <ErrorState error={error} onRetry={() => void refetch()} />
    );
  }

  return (
    <Form
      key={data.id}
      applicationId={data.id}
      initialValues={valuesFrom(data)}
      initialCandidate={data.candidate}
    />
  );
};

export const ApplicationForm = () => {
  const { id } = useParams();
  return id ? <EditApplication id={id} /> : <CreateApplication />;
};
