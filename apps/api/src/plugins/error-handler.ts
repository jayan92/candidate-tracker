import { Prisma } from "@prisma/client";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import type { ApiError } from "@candidate-tracker/shared";

import { HttpError } from "../lib/http-errors";

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  409: "Conflict",
  500: "Internal Server Error",
};

const statusText = (statusCode: number): string =>
  STATUS_TEXT[statusCode] ?? "Error";

const uniqueTargets = (meta: unknown): string[] => {
  if (typeof meta !== "object" || meta === null || !("target" in meta))
    return [];
  const target: unknown = (meta as { target: unknown }).target;
  if (typeof target === "string") return [target];
  if (Array.isArray(target)) {
    return (target as unknown[]).filter(
      (t): t is string => typeof t === "string",
    );
  }
  return [];
};

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const body: ApiError = {
      statusCode: 400,
      error: "Bad Request",
      message: "Request validation failed",
      issues: error.validation.map((v) => ({
        path: v.params.issue.path.join("."),
        message: v.params.issue.message,
      })),
    };
    return reply.code(400).send(body);
  }

  if (isResponseSerializationError(error)) {
    request.log.error(
      { err: error, url: request.url, method: request.method },
      "response failed its own schema",
    );
    const body: ApiError = {
      statusCode: 500,
      error: "Internal Server Error",
      message: "Internal server error",
    };
    return reply.code(500).send(body);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      // Unique constraint (e.g. Candidate.email). Replaces the racy
      // read-then-write check a route would otherwise need.
      case "P2002": {
        const fields = uniqueTargets(error.meta);
        const body: ApiError = {
          statusCode: 409,
          error: "Conflict",
          message: fields.length
            ? `A record with this ${fields.join(", ")} already exists`
            : "A record with these values already exists",
          issues: fields.map((path) => ({ path, message: "Already exists" })),
        };
        return reply.code(409).send(body);
      }

      case "P2025": {
        const body: ApiError = {
          statusCode: 404,
          error: "Not Found",
          message: "Record not found",
        };
        return reply.code(404).send(body);
      }

      case "P2003": {
        const body: ApiError = {
          statusCode: 400,
          error: "Bad Request",
          message: "Related record does not exist",
        };
        return reply.code(400).send(body);
      }
    }
  }

  if (error instanceof HttpError) {
    const body: ApiError = {
      statusCode: error.statusCode,
      error: statusText(error.statusCode),
      message: error.message,
    };
    return reply.code(error.statusCode).send(body);
  }

  const statusCode =
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 500
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    request.log.error({ err: error, url: request.url }, "unhandled error");
  }

  const body: ApiError = {
    statusCode,
    error: statusText(statusCode),
    message: statusCode >= 500 ? "Internal server error" : error.message,
  };
  return reply.code(statusCode).send(body);
};
