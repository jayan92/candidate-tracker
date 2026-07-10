import type {
  Candidate,
  CandidateCreateInput,
  CandidateDetail,
} from "@candidate-tracker/shared";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiRequestError } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { fieldClass, fieldErrorClass, FormField } from "../components/FormField";
import { Skeleton } from "../components/Skeleton";
import {
  useCandidate,
  useCreateCandidate,
  useUpdateCandidate,
} from "../hooks/useCandidates";
import { nullable } from "../lib/form";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  notes: string;
};

const emptyValues: FormValues = {
  name: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  notes: "",
};

const valuesFrom = (candidate: CandidateDetail): FormValues => ({
  name: candidate.name,
  email: candidate.email,
  phone: candidate.phone ?? "",
  location: candidate.location ?? "",
  linkedinUrl: candidate.linkedinUrl ?? "",
  notes: candidate.notes ?? "",
});

type FormProps = {
  candidateId: string | null;
  initialValues: FormValues;
};

const Form = ({ candidateId, initialValues }: FormProps) => {
  const navigate = useNavigate();
  const isEdit = candidateId !== null;

  const [values, setValues] = useState(initialValues);

  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate(candidateId ?? "");
  const mutation = isEdit ? updateCandidate : createCandidate;

  const errors =
    mutation.error instanceof ApiRequestError ? mutation.error.fieldErrors : {};

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

    const payload: CandidateCreateInput = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: nullable(values.phone),
      location: nullable(values.location),
      linkedinUrl: nullable(values.linkedinUrl),
      notes: nullable(values.notes),
    };

    const onSuccess = (candidate: Candidate) =>
      navigate(`/candidates/${candidate.id}`);

    if (isEdit) updateCandidate.mutate(payload, { onSuccess });
    else createCandidate.mutate(payload, { onSuccess });
  };

  const inputClass = (field: keyof FormValues) =>
    errors[field] ? fieldErrorClass : fieldClass;

  const backTo = isEdit ? `/candidates/${candidateId}` : "/candidates";

  return (
    <div className="space-y-6">
      <Link
        to={backTo}
        className="inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        {isEdit ? "← Back to candidate" : "← Back to candidates"}
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900">
        {isEdit ? "Edit candidate" : "New candidate"}
      </h1>

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
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="name" label="Name" required error={errors.name}>
            <input
              id="name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              className={inputClass("name")}
            />
          </FormField>

          <FormField id="email" label="Email" required error={errors.email}>
            <input
              id="email"
              type="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              className={inputClass("email")}
            />
          </FormField>

          <FormField id="phone" label="Phone" error={errors.phone}>
            <input
              id="phone"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              className={inputClass("phone")}
            />
          </FormField>

          <FormField id="location" label="Location" error={errors.location}>
            <input
              id="location"
              value={values.location}
              onChange={(event) => set("location", event.target.value)}
              className={inputClass("location")}
            />
          </FormField>
        </div>

        <FormField
          id="linkedinUrl"
          label="LinkedIn URL"
          error={errors.linkedinUrl}
          hint="Leave blank, or paste a full URL including https://"
        >
          <input
            id="linkedinUrl"
            value={values.linkedinUrl}
            onChange={(event) => set("linkedinUrl", event.target.value)}
            placeholder="https://linkedin.com/in/…"
            className={inputClass("linkedinUrl")}
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
                : "Create candidate"}
          </button>
          <Link
            to={backTo}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

const FormSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-8 w-56" />
    <Skeleton className="h-[440px]" />
  </div>
);

const EditCandidate = ({ id }: { id: string }) => {
  const { data, isPending, isError, error, refetch } = useCandidate(id);

  if (isPending) return <FormSkeleton />;

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

  return <Form key={data.id} candidateId={data.id} initialValues={valuesFrom(data)} />;
};

export const CandidateForm = () => {
  const { id } = useParams();
  return id ? (
    <EditCandidate id={id} />
  ) : (
    <Form candidateId={null} initialValues={emptyValues} />
  );
};
