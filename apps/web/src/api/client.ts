import { ApiErrorSchema, type ApiError } from "@candidate-tracker/shared";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not set. Copy apps/web/.env.example to .env.",
  );
}

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly issues: ApiError["issues"];

  constructor({ statusCode, error, message, issues }: ApiError) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.error = error;
    this.issues = issues;
  }

  get fieldErrors(): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const issue of this.issues ?? []) {
      fields[issue.path] ??= issue.message;
    }
    return fields;
  }
}

export const isRetryable = (error: unknown): boolean =>
  !(
    error instanceof ApiRequestError &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );

const parseErrorBody = async (response: Response): Promise<ApiError> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) return parsed.data;

  return {
    statusCode: response.status,
    error: response.statusText || "Error",
    message: `Request failed with status ${response.status}`,
  };
};

const send = async (path: string, init?: RequestInit): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiRequestError({
      statusCode: 0,
      error: "Network Error",
      message: "Could not reach the API. Is it running on port 3001?",
    });
  }

  if (!response.ok) throw new ApiRequestError(await parseErrorBody(response));
  return response;
};

export const requestJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => (await send(path, init)).json() as Promise<T>;

export const requestVoid = async (
  path: string,
  init?: RequestInit,
): Promise<void> => {
  await send(path, init);
};

export type QueryParams = Record<string, string | number | undefined>;

export const buildQuery = (params: QueryParams): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
};
