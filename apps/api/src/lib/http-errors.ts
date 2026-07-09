export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "Not found"): HttpError =>
  new HttpError(404, message);

export const conflict = (message = "Conflict"): HttpError =>
  new HttpError(409, message);

export const badRequest = (message = "Bad request"): HttpError =>
  new HttpError(400, message);
