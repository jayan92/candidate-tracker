import { buildApp as buildRealApp, type BuildAppOptions } from "../src/app";
import { prisma } from "../src/lib/prisma";

/**
 * The app under test: identical to production except the OpenAPI docs and the
 * request logger are off. Nothing in the test suite exercises Swagger UI, and
 * mounting its static assets on every test file is pure overhead.
 */
export const buildApp = (options: BuildAppOptions = {}) =>
  buildRealApp({ logger: false, docs: false, ...options });

const assertTestDatabase = (): void => {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("candidate_tracker_test")) {
    throw new Error(
      "Refusing to truncate: DATABASE_URL is not the test database",
    );
  }
};

export const resetDatabase = async (): Promise<void> => {
  assertTestDatabase();
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
};

export const makeCandidate = async (
  overrides: Partial<{
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
  }> = {},
) =>
  prisma.candidate.create({
    data: {
      name: overrides.name ?? "Test Candidate",
      email:
        overrides.email ??
        `test.${Math.random().toString(36).slice(2)}@example.com`,
      phone: overrides.phone ?? null,
      location: overrides.location ?? null,
    },
  });

export { prisma };
