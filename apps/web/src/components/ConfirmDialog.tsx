import { useEffect, useRef } from "react";

import { ApiRequestError } from "../api/client";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  error: unknown;
  onConfirm: () => void;
  onCancel: () => void;
};

const messageOf = (error: unknown): string | null => {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return null;
};

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus lands on Cancel, not Confirm: a stray Enter must not delete anything.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPending, onCancel]);

  const errorMessage = messageOf(error);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !isPending && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
