import { applicationStatusValues } from "@candidate-tracker/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp, makeCandidate, prisma, resetDatabase } from "./helpers";

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

beforeEach(resetDatabase);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const thisMonth = (day: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12));
};
const monthsAgo = (n: number, day: number) => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, day, 12),
  );
};

describe("GET /api/dashboard", () => {
  it("returns all six metrics with the correct types on an empty database", async () => {
    const res = await app.inject({ method: "GET", url: "/api/dashboard" });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(typeof body.totalCandidates).toBe("number");
    expect(typeof body.totalApplications).toBe("number");
    expect(Array.isArray(body.applicationsByStatus)).toBe(true);
    expect(typeof body.hiredThisMonth).toBe("number");
    expect(typeof body.rejectionRate).toBe("number");
    expect(Array.isArray(body.latestApplications)).toBe(true);

    expect(body.totalCandidates).toBe(0);
    expect(body.totalApplications).toBe(0);
    // Guarded against divide-by-zero.
    expect(body.rejectionRate).toBe(0);
    expect(body.latestApplications).toEqual([]);
  });

  it("always reports all six statuses, backfilling those with no rows", async () => {
    const c = await makeCandidate();
    await prisma.application.create({
      data: {
        candidateId: c.id,
        jobTitle: "Dev",
        company: "Acme",
        status: "applied",
        appliedAt: monthsAgo(1, 10),
        currencyCode: "USD",
      },
    });

    const body = (
      await app.inject({ method: "GET", url: "/api/dashboard" })
    ).json();

    expect(body.applicationsByStatus).toHaveLength(6);
    expect(
      body.applicationsByStatus.map((s: { status: string }) => s.status),
    ).toEqual([...applicationStatusValues]);
    expect(
      body.applicationsByStatus.find(
        (s: { status: string }) => s.status === "offer",
      ).count,
    ).toBe(0);
    expect(
      body.applicationsByStatus.find(
        (s: { status: string }) => s.status === "applied",
      ).count,
    ).toBe(1);
  });

  it("computes counts, hiredThisMonth and rejectionRate from real data", async () => {
    const c = await makeCandidate();
    const mk = (status: string, appliedAt: Date) =>
      prisma.application.create({
        data: {
          candidateId: c.id,
          jobTitle: "Dev",
          company: "Acme",
          status: status as "applied",
          appliedAt,
          currencyCode: "USD",
        },
      });

    await mk("hired", thisMonth(1));
    await mk("hired", monthsAgo(2, 5));
    await mk("rejected", monthsAgo(1, 5));
    await mk("applied", monthsAgo(1, 6));

    const body = (
      await app.inject({ method: "GET", url: "/api/dashboard" })
    ).json();

    expect(body.totalCandidates).toBe(1);
    expect(body.totalApplications).toBe(4);
    expect(body.hiredThisMonth).toBe(1);
    expect(body.rejectionRate).toBe(25);

    const sum = body.applicationsByStatus.reduce(
      (acc: number, s: { count: number }) => acc + s.count,
      0,
    );
    expect(sum).toBe(body.totalApplications);
  });

  it("returns at most 5 latestApplications, newest first, each with its candidate", async () => {
    const c = await makeCandidate({ name: "Ada Lovelace" });
    for (let i = 1; i <= 7; i++) {
      await prisma.application.create({
        data: {
          candidateId: c.id,
          jobTitle: `Job ${i}`,
          company: "Acme",
          status: "applied",
          appliedAt: monthsAgo(0, i),
          currencyCode: "USD",
        },
      });
    }

    const body = (
      await app.inject({ method: "GET", url: "/api/dashboard" })
    ).json();

    expect(body.latestApplications).toHaveLength(5);
    expect(body.latestApplications[0].jobTitle).toBe("Job 7");
    expect(body.latestApplications[0].candidate.name).toBe("Ada Lovelace");

    const dates = body.latestApplications.map(
      (a: { appliedAt: string }) => a.appliedAt,
    );
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("excludes soft-deleted candidates and their applications from every metric", async () => {
    const live = await makeCandidate({ email: "live@example.com" });
    const gone = await makeCandidate({ email: "gone@example.com" });

    await prisma.application.create({
      data: {
        candidateId: live.id,
        jobTitle: "Live",
        company: "Acme",
        status: "applied",
        appliedAt: thisMonth(1),
        currencyCode: "USD",
      },
    });
    await prisma.application.create({
      data: {
        candidateId: gone.id,
        jobTitle: "Ghost",
        company: "Acme",
        status: "hired",
        appliedAt: thisMonth(1),
        currencyCode: "USD",
      },
    });
    await prisma.candidate.update({
      where: { id: gone.id },
      data: { deletedAt: new Date() },
    });

    const body = (
      await app.inject({ method: "GET", url: "/api/dashboard" })
    ).json();

    expect(body.totalCandidates).toBe(1);
    expect(body.totalApplications).toBe(1);
    expect(body.hiredThisMonth).toBe(0);
    expect(body.latestApplications).toHaveLength(1);
    expect(body.latestApplications[0].jobTitle).toBe("Live");

    expect(await prisma.candidate.count()).toBe(2);
    expect(await prisma.application.count()).toBe(2);
  });
});
