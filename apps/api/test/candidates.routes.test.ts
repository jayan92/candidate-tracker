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

describe("POST /api/candidates", () => {
  it("creates a candidate and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        location: "Colombo",
      },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      location: "Colombo",
    });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).not.toHaveProperty("deletedAt");
    expect(body.phone).toBeNull();
  });

  it("normalises the email and turns blank optionals into null", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: {
        name: "  Grace Hopper ",
        email: "  GRACE@Example.COM  ",
        notes: "",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().email).toBe("grace@example.com");
    expect(res.json().name).toBe("Grace Hopper");
    expect(res.json().notes).toBeNull();
  });

  it("returns 400 with field-level issues for an invalid body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: { name: "", linkedinUrl: "not-a-url" },
    });

    expect(res.statusCode).toBe(400);

    const body = res.json();
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe("Bad Request");

    const paths = body.issues.map((i: { path: string }) => i.path);
    expect(paths).toContain("email");
    expect(paths).toContain("name");
    expect(paths).toContain("linkedinUrl");

    expect(await prisma.candidate.count()).toBe(0);
  });

  it("returns 409 when the email is already taken", async () => {
    await makeCandidate({ email: "dup@example.com" });

    const res = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: { name: "Impostor", email: "dup@example.com" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Conflict");
    expect(res.json().issues).toEqual([
      { path: "email", message: "Already exists" },
    ]);
  });

  it("returns 409 for a duplicate that differs only by case and whitespace", async () => {
    await makeCandidate({ email: "dup@example.com" });

    const res = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: { name: "Impostor", email: "  DUP@Example.COM  " },
    });

    expect(res.statusCode).toBe(409);
  });
});

describe("GET /api/candidates", () => {
  it("returns a paginated envelope with defaults applied", async () => {
    for (let i = 0; i < 3; i++) {
      await makeCandidate({ name: `Person ${i}`, email: `p${i}@example.com` });
    }

    const res = await app.inject({ method: "GET", url: "/api/candidates" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(3);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.data).toHaveLength(3);
  });

  it("paginates without changing the total", async () => {
    for (let i = 0; i < 5; i++) {
      await makeCandidate({ name: `Person ${i}`, email: `p${i}@example.com` });
    }

    const page1 = await app.inject({
      method: "GET",
      url: "/api/candidates?page=1&pageSize=2",
    });
    const page3 = await app.inject({
      method: "GET",
      url: "/api/candidates?page=3&pageSize=2",
    });

    expect(page1.json().data).toHaveLength(2);
    expect(page3.json().data).toHaveLength(1);
    expect(page1.json().total).toBe(5);
    expect(page3.json().total).toBe(5);
  });

  it("filters by name, case-insensitively", async () => {
    await makeCandidate({ name: "Ada Lovelace", email: "ada@example.com" });
    await makeCandidate({ name: "Grace Hopper", email: "grace@example.com" });

    const res = await app.inject({
      method: "GET",
      url: "/api/candidates?search=lovelace",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
    expect(res.json().data[0].name).toBe("Ada Lovelace");
  });

  it("also searches email, location and phone", async () => {
    await makeCandidate({
      name: "Ada",
      email: "ada@northwind.io",
      location: "Colombo",
      phone: "+94771234567",
    });
    await makeCandidate({
      name: "Grace",
      email: "grace@example.com",
      location: "Kandy",
    });

    for (const term of ["northwind", "colombo", "94771234567"]) {
      const res = await app.inject({
        method: "GET",
        url: `/api/candidates?search=${term}`,
      });
      expect(res.json().total, `search=${term}`).toBe(1);
      expect(res.json().data[0].name, `search=${term}`).toBe("Ada");
    }
  });

  it("returns an empty page rather than an error when nothing matches", async () => {
    await makeCandidate({ name: "Ada", email: "ada@example.com" });

    const res = await app.inject({
      method: "GET",
      url: "/api/candidates?search=nobodyhere",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
    expect(res.json().data).toEqual([]);
  });

  it("never returns soft-deleted candidates", async () => {
    const deleted = await makeCandidate({
      name: "Zara Deleted",
      email: "zara@example.com",
    });
    await prisma.candidate.update({
      where: { id: deleted.id },
      data: { deletedAt: new Date() },
    });
    await makeCandidate({ name: "Ada Lovelace", email: "ada@example.com" });

    const all = await app.inject({ method: "GET", url: "/api/candidates" });
    expect(all.json().total).toBe(1);

    const searched = await app.inject({
      method: "GET",
      url: "/api/candidates?search=Zara",
    });
    expect(searched.json().total).toBe(0);

    expect(await prisma.candidate.count()).toBe(2);
  });

  it("rejects an out-of-range pageSize", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/candidates?pageSize=500",
    });
    expect(res.statusCode).toBe(400);
  });
});
