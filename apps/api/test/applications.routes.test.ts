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

const makeApplication = (
  candidateId: string,
  overrides: Record<string, unknown> = {},
) =>
  prisma.application.create({
    data: {
      candidateId,
      jobTitle: "Backend Engineer",
      company: "Initech",
      status: "applied",
      appliedAt: new Date("2026-03-01T10:00:00Z"),
      currencyCode: "USD",
      ...overrides,
    },
  });

describe("GET /api/applications — cross-entity search", () => {
  it("finds applications by their parent candidate's NAME", async () => {
    const ada = await makeCandidate({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    const grace = await makeCandidate({
      name: "Grace Hopper",
      email: "grace@example.com",
    });

    await makeApplication(ada.id, {
      jobTitle: "Platform Engineer",
      company: "Initech",
    });
    await makeApplication(grace.id, {
      jobTitle: "Data Analyst",
      company: "Globex",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/applications?search=Lovelace",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
    expect(res.json().data[0].jobTitle).toBe("Platform Engineer");
    expect(res.json().data[0].candidate.name).toBe("Ada Lovelace");
  });

  it("finds applications by their parent candidate's EMAIL and LOCATION", async () => {
    const ada = await makeCandidate({
      name: "Ada Lovelace",
      email: "ada@northwind.io",
      location: "Colombo",
    });
    const grace = await makeCandidate({
      name: "Grace Hopper",
      email: "grace@example.com",
      location: "Kandy",
    });
    await makeApplication(ada.id, { jobTitle: "Platform Engineer" });
    await makeApplication(grace.id, { jobTitle: "Data Analyst" });

    for (const term of ["northwind", "colombo"]) {
      const res = await app.inject({
        method: "GET",
        url: `/api/applications?search=${term}`,
      });
      expect(res.json().total, `search=${term}`).toBe(1);
      expect(res.json().data[0].jobTitle, `search=${term}`).toBe(
        "Platform Engineer",
      );
    }
  });

  it("also matches the application's own jobTitle, company, source and notes", async () => {
    const c = await makeCandidate({
      name: "Nobody",
      email: "nobody@example.com",
    });
    await makeApplication(c.id, {
      jobTitle: "Flutter Developer",
      company: "Vandelay",
      source: "referral",
      notes: "verbal offer extended",
    });

    for (const term of ["flutter", "vandelay", "referral", "verbal"]) {
      const res = await app.inject({
        method: "GET",
        url: `/api/applications?search=${term}`,
      });
      expect(res.json().total, `search=${term}`).toBe(1);
    }
  });

  it("matches case-insensitively", async () => {
    const ada = await makeCandidate({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    await makeApplication(ada.id);

    const res = await app.inject({
      method: "GET",
      url: "/api/applications?search=LOVELACE",
    });
    expect(res.json().total).toBe(1);
  });

  it("never surfaces applications belonging to a soft-deleted candidate", async () => {
    const zara = await makeCandidate({
      name: "Zara Lovelace",
      email: "zara@example.com",
    });
    await makeApplication(zara.id, { jobTitle: "Ghost Engineer" });
    await prisma.candidate.update({
      where: { id: zara.id },
      data: { deletedAt: new Date() },
    });

    const bySearch = await app.inject({
      method: "GET",
      url: "/api/applications?search=Lovelace",
    });
    expect(bySearch.json().total).toBe(0);

    const all = await app.inject({ method: "GET", url: "/api/applications" });
    expect(all.json().total).toBe(0);

    expect(await prisma.application.count()).toBe(1); // still in the table
  });

  it("treats a search term as a bound parameter, not SQL", async () => {
    const c = await makeCandidate({ name: "Ada", email: "ada@example.com" });
    await makeApplication(c.id);

    const res = await app.inject({
      method: "GET",
      url: `/api/applications?search=${encodeURIComponent(`'; DROP TABLE "Application"; --`)}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
    expect(await prisma.application.count()).toBe(1); // table intact
  });

  it("combines search with the status and date-range filters", async () => {
    const ada = await makeCandidate({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    await makeApplication(ada.id, {
      status: "hired",
      appliedAt: new Date("2026-03-15T09:30:00Z"),
    });
    await makeApplication(ada.id, {
      status: "rejected",
      appliedAt: new Date("2026-06-01T09:00:00Z"),
    });

    const hired = await app.inject({
      method: "GET",
      url: "/api/applications?search=Lovelace&status=hired",
    });
    expect(hired.json().total).toBe(1);

    const ranged = await app.inject({
      method: "GET",
      url: "/api/applications?search=Lovelace&appliedFrom=2026-03-01&appliedTo=2026-03-15",
    });
    expect(ranged.json().total).toBe(1);

    const empty = await app.inject({
      method: "GET",
      url: "/api/applications?search=Lovelace&status=",
    });
    expect(empty.json().total).toBe(2);
  });

  it("rejects an invalid status or date", async () => {
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/applications?status=pending",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/applications?appliedFrom=notadate",
        })
      ).statusCode,
    ).toBe(400);
  });
});

describe("POST /api/applications", () => {
  it("creates an application and returns 201", async () => {
    const c = await makeCandidate();

    const res = await app.inject({
      method: "POST",
      url: "/api/applications",
      payload: {
        candidateId: c.id,
        jobTitle: "Senior Backend Engineer",
        company: "Initech",
        appliedAt: "2026-07-01",
        salaryExpectation: 120000,
        currencyCode: "EUR",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.jobTitle).toBe("Senior Backend Engineer");
    expect(body.status).toBe("applied");
    expect(body.currencyCode).toBe("EUR");
    expect(body.appliedAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("defaults status and currencyCode when omitted", async () => {
    const c = await makeCandidate();
    const res = await app.inject({
      method: "POST",
      url: "/api/applications",
      payload: {
        candidateId: c.id,
        jobTitle: "Dev",
        company: "Acme",
        appliedAt: "2026-05-01",
      },
    });

    expect(res.json().status).toBe("applied");
    expect(res.json().currencyCode).toBe("USD");
  });

  it("returns 400 when required fields are missing", async () => {
    const c = await makeCandidate();

    const res = await app.inject({
      method: "POST",
      url: "/api/applications",
      payload: { candidateId: c.id, company: "Initech" },
    });

    expect(res.statusCode).toBe(400);
    const paths = res.json().issues.map((i: { path: string }) => i.path);
    expect(paths).toContain("jobTitle");
    expect(paths).toContain("appliedAt");
    expect(await prisma.application.count()).toBe(0);
  });

  it("returns 400 for an invalid status enum value", async () => {
    const c = await makeCandidate();
    const res = await app.inject({
      method: "POST",
      url: "/api/applications",
      payload: {
        candidateId: c.id,
        jobTitle: "X",
        company: "Y",
        appliedAt: "2026-01-01",
        status: "pending",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when candidateId does not exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/applications",
      payload: {
        candidateId: "00000000-0000-0000-0000-000000000000",
        jobTitle: "X",
        company: "Y",
        appliedAt: "2026-01-01",
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Not Found");
  });

  it("returns 404 when the candidate is soft-deleted", async () => {
    const c = await makeCandidate();
    await prisma.candidate.update({
      where: { id: c.id },
      data: { deletedAt: new Date() },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/applications",
      payload: {
        candidateId: c.id,
        jobTitle: "X",
        company: "Y",
        appliedAt: "2026-01-01",
      },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /api/applications/:id", () => {
  it("updates an application and returns 200", async () => {
    const c = await makeCandidate();
    const a = await makeApplication(c.id, { source: "linkedin" });

    const res = await app.inject({
      method: "PATCH",
      url: `/api/applications/${a.id}`,
      payload: { status: "interview" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("interview");
    expect(res.json().jobTitle).toBe("Backend Engineer");
    expect(res.json().source).toBe("linkedin");
  });

  it('clears an optional field when sent as ""', async () => {
    const c = await makeCandidate();
    const a = await makeApplication(c.id, { source: "linkedin" });

    const res = await app.inject({
      method: "PATCH",
      url: `/api/applications/${a.id}`,
      payload: { source: "" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBeNull();
  });

  it("reassigns the application to a different candidate", async () => {
    const from = await makeCandidate({ email: "from@example.com" });
    const to = await makeCandidate({ email: "to@example.com" });
    const a = await makeApplication(from.id);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/applications/${a.id}`,
      payload: { candidateId: to.id },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().candidateId).toBe(to.id);
  });

  it("returns 404 for an unknown application id", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/applications/00000000-0000-0000-0000-000000000000",
      payload: { status: "hired" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Not Found");
  });

  it("returns 404 when reassigning to a candidate that does not exist", async () => {
    const c = await makeCandidate();
    const a = await makeApplication(c.id);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/applications/${a.id}`,
      payload: { candidateId: "00000000-0000-0000-0000-000000000000" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a non-uuid id", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/applications/banana",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
