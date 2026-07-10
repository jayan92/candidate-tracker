import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { errorHandler } from "./plugins/error-handler";
import { applicationRoutes } from "./routes/applications";
import { candidateRoutes } from "./routes/candidates";
import { dashboardRoutes } from "./routes/dashboard";

export interface BuildAppOptions {
  /** Off in tests, on in the real server (brief section 6.2 requires request logging). */
  logger?: boolean;
  /** Mount the OpenAPI spec + Swagger UI. Off in tests — nothing there to test. */
  docs?: boolean;
}

/**
 * Builds a fully wired Fastify instance WITHOUT binding a socket.
 *
 * server.ts calls listen() on it; tests hand it to `app.inject()`, which pushes a
 * synthetic request through the identical pipeline — routing, Zod validation,
 * handler, serialization, error handler — with no port, no network, no cleanup.
 */
export const buildApp = async ({
  logger = false,
  docs = true,
}: BuildAppOptions = {}) => {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Single global error handler — brief section 6.2. No try/catch in routes.
  app.setErrorHandler(errorHandler);

  // apps/web runs on a different origin (Vite, :5173) to this API (:3001), so
  // the browser blocks its fetches without an explicit allow. Scoped to the one
  // known origin rather than `*`: this is a staff-only tool, and a wildcard
  // would let any page on the internet call the API from a visitor's browser.
  await app.register(fastifyCors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  });

  if (docs) {
    // `jsonSchemaTransform` converts each route's Zod schemas into OpenAPI. The
    // docs are therefore GENERATED FROM the schemas that do the actual runtime
    // validation — they cannot drift from the implementation.
    // Must be registered before the routes it documents.
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: "Candidate Tracker API",
          description:
            "Internal, staff-only API for tracking job candidates and their applications.\n\n" +
            "**Every error response** uses the same envelope: `{ statusCode, error, message, issues? }`. " +
            "`issues` is populated for validation failures (400) and unique-constraint conflicts (409), " +
            "where `path` names the offending field so a form can render the message beside the right input.\n\n" +
            "**Soft delete:** deleting a candidate sets `deletedAt` rather than removing the row. " +
            "Soft-deleted candidates — and their applications — disappear from every list, search, detail " +
            "and dashboard metric.",
          version: "1.0.0",
        },
        servers: [{ url: "http://localhost:3001", description: "Local development" }],
        tags: [
          { name: "Candidates", description: "The people. Parent entity; soft-deleted." },
          { name: "Applications", description: "A job a candidate applied for. Child entity; hard-deleted." },
          { name: "Dashboard", description: "Aggregate metrics, computed in the database." },
        ],
      },
      transform: jsonSchemaTransform,
    });

    await app.register(fastifySwaggerUi, {
      routePrefix: "/docs",
      uiConfig: { docExpansion: "list", deepLinking: true },
    });
  }

  await app.register(candidateRoutes, { prefix: "/api" });
  await app.register(applicationRoutes, { prefix: "/api" });
  await app.register(dashboardRoutes, { prefix: "/api" });

  return app;
};
