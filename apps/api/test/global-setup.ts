import { execSync } from "node:child_process";

export default function setup(): void {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — expected it from apps/api/.env.test",
    );
  }

  if (!url.includes("candidate_tracker_test")) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL does not point at the test database.\n` +
        `  got: ${url.replace(/:\/\/.*@/, "://***@")}`,
    );
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
