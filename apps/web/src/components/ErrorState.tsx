import { ApiRequestError } from "../api/client";

const messageOf = (error: unknown): string => {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
};

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
  <div
    role="alert"
    className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
  >
    <p className="font-medium text-red-900">Could not load this data</p>
    <p className="mt-1 text-sm text-red-700">{messageOf(error)}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Try again
      </button>
    )}
  </div>
);
