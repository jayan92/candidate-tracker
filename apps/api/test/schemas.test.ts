import {
  ApplicationCreateSchema,
  ApplicationListQuerySchema,
  ApplicationStatusSchema,
  ApplicationUpdateSchema,
  CandidateCreateSchema,
  CandidateUpdateSchema,
  CurrencyCodeSchema,
  applicationStatusValues,
  currencyCodes,
} from "@candidate-tracker/shared";
import { describe, expect, it } from "vitest";

const UUID = "11111111-1111-1111-1111-111111111111";

const messageFor = (
  result: {
    success: false;
    error: { issues: { path: PropertyKey[]; message: string }[] };
  },
  field: string,
): string | undefined =>
  result.error.issues.find((i) => i.path.join(".") === field)?.message;

describe("CandidateCreateSchema", () => {
  it("accepts a fully populated valid candidate", () => {
    const result = CandidateCreateSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+94771234567",
      location: "Colombo",
      linkedinUrl: "https://linkedin.com/in/ada",
      notes: "Strong systems background",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a minimal candidate (name + email only)", () => {
    const result = CandidateCreateSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("trims and lowercases the email, and trims the name", () => {
    const result = CandidateCreateSchema.parse({
      name: "  Ada Lovelace  ",
      email: "  ADA@Example.COM  ",
    });

    expect(result.email).toBe("ada@example.com");
    expect(result.name).toBe("Ada Lovelace");
  });

  it("turns a blank optional field into null (so PATCH can clear it), and omits absent ones", () => {
    const cleared = CandidateCreateSchema.parse({
      name: "Ada",
      email: "a@b.com",
      notes: "",
    });
    expect(cleared.notes).toBeNull();

    const omitted = CandidateCreateSchema.parse({
      name: "Ada",
      email: "a@b.com",
    });

    expect(omitted.notes).toBeUndefined();
  });

  it("rejects a missing name with the right message", () => {
    const result = CandidateCreateSchema.safeParse({
      name: "",
      email: "a@b.com",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(messageFor(result, "name")).toBe("Name is required");
  });

  it("rejects a whitespace-only name (trim runs before min length)", () => {
    const result = CandidateCreateSchema.safeParse({
      name: "   ",
      email: "a@b.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = CandidateCreateSchema.safeParse({ name: "Ada" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(messageFor(result, "email")).toBe("Required");
  });

  it("rejects a malformed email with the right message", () => {
    const result = CandidateCreateSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(messageFor(result, "email")).toBe("Must be a valid email");
  });

  it("rejects a malformed linkedinUrl but accepts a blank one", () => {
    const bad = CandidateCreateSchema.safeParse({
      name: "Ada",
      email: "a@b.com",
      linkedinUrl: "nope",
    });
    expect(bad.success).toBe(false);
    if (!bad.success)
      expect(messageFor(bad, "linkedinUrl")).toBe("Must be a valid URL");

    const blank = CandidateCreateSchema.safeParse({
      name: "Ada",
      email: "a@b.com",
      linkedinUrl: "",
    });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.linkedinUrl).toBeNull();
  });
});

describe("CandidateUpdateSchema", () => {
  it("accepts an empty object (nothing to change)", () => {
    const result = CandidateUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("distinguishes 'omitted' from 'cleared'", () => {
    expect(Object.hasOwn(CandidateUpdateSchema.parse({}), "notes")).toBe(false);

    expect(CandidateUpdateSchema.parse({ notes: "" }).notes).toBeNull();
    expect(CandidateUpdateSchema.parse({ notes: null }).notes).toBeNull();
  });

  it("still validates the fields that ARE present", () => {
    expect(CandidateUpdateSchema.safeParse({ email: "nope" }).success).toBe(
      false,
    );
  });
});

describe("ApplicationStatusSchema / CurrencyCodeSchema", () => {
  it("accepts every declared status", () => {
    for (const s of applicationStatusValues) {
      expect(ApplicationStatusSchema.safeParse(s).success, s).toBe(true);
    }
  });

  it("rejects an undeclared status", () => {
    expect(ApplicationStatusSchema.safeParse("pending").success).toBe(false);
  });

  it("accepts every declared currency and rejects others", () => {
    for (const c of currencyCodes) {
      expect(CurrencyCodeSchema.safeParse(c).success, c).toBe(true);
    }
    expect(CurrencyCodeSchema.safeParse("GBP").success).toBe(false);
  });
});

describe("ApplicationCreateSchema", () => {
  const valid = {
    candidateId: UUID,
    jobTitle: "Backend Engineer",
    company: "Initech",
    appliedAt: "2026-03-01",
  };

  it("accepts a valid application and applies defaults", () => {
    const result = ApplicationCreateSchema.parse(valid);
    expect(result.status).toBe("applied");
    expect(result.currencyCode).toBe("USD");
  });

  it("coerces a date-only appliedAt string into a Date", () => {
    const result = ApplicationCreateSchema.parse(valid);
    expect(result.appliedAt).toBeInstanceOf(Date);
    expect(result.appliedAt.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("coerces a numeric string salaryExpectation", () => {
    const result = ApplicationCreateSchema.parse({
      ...valid,
      salaryExpectation: "120000",
    });
    expect(result.salaryExpectation).toBe(120000);
  });

  it("rejects a non-uuid candidateId with the right message", () => {
    const result = ApplicationCreateSchema.safeParse({
      ...valid,
      candidateId: "banana",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(messageFor(result, "candidateId")).toBe(
      "Must be a valid candidate id",
    );
  });

  it("rejects a missing jobTitle with the right message", () => {
    const result = ApplicationCreateSchema.safeParse({
      ...valid,
      jobTitle: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(messageFor(result, "jobTitle")).toBe("Job title is required");
  });

  it("rejects a missing company with the right message", () => {
    const result = ApplicationCreateSchema.safeParse({ ...valid, company: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(messageFor(result, "company")).toBe("Company is required");
  });

  it("rejects an invalid appliedAt", () => {
    expect(
      ApplicationCreateSchema.safeParse({ ...valid, appliedAt: "not-a-date" })
        .success,
    ).toBe(false);
  });

  it("rejects a non-integer or non-positive salaryExpectation", () => {
    const fractional = ApplicationCreateSchema.safeParse({
      ...valid,
      salaryExpectation: 1.5,
    });
    expect(fractional.success).toBe(false);
    if (!fractional.success)
      expect(messageFor(fractional, "salaryExpectation")).toBe(
        "Must be a whole number",
      );

    expect(
      ApplicationCreateSchema.safeParse({ ...valid, salaryExpectation: -1 })
        .success,
    ).toBe(false);
    expect(
      ApplicationCreateSchema.safeParse({ ...valid, salaryExpectation: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid status or currencyCode", () => {
    expect(
      ApplicationCreateSchema.safeParse({ ...valid, status: "pending" })
        .success,
    ).toBe(false);
    expect(
      ApplicationCreateSchema.safeParse({ ...valid, currencyCode: "GBP" })
        .success,
    ).toBe(false);
  });
});

describe("ApplicationUpdateSchema", () => {
  it("accepts an empty object and does NOT inject the create-time defaults", () => {
    const result = ApplicationUpdateSchema.parse({});
    expect(Object.hasOwn(result, "status")).toBe(false);
    expect(Object.hasOwn(result, "currencyCode")).toBe(false);
  });

  it("still validates present fields", () => {
    expect(ApplicationUpdateSchema.safeParse({ status: "zzz" }).success).toBe(
      false,
    );
    expect(ApplicationUpdateSchema.safeParse({ status: "hired" }).success).toBe(
      true,
    );
  });
});

describe("ApplicationListQuerySchema", () => {
  it("applies pagination defaults", () => {
    const result = ApplicationListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("coerces numeric strings from the query string", () => {
    const result = ApplicationListQuerySchema.parse({
      page: "3",
      pageSize: "50",
    });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("treats empty status/date values as 'no filter' rather than invalid", () => {
    const result = ApplicationListQuerySchema.parse({
      status: "",
      appliedFrom: "",
      appliedTo: "",
    });
    expect(result.status).toBeUndefined();
    expect(result.appliedFrom).toBeUndefined();
    expect(result.appliedTo).toBeUndefined();
  });

  it("rejects an out-of-range pageSize and a non-numeric page", () => {
    expect(
      ApplicationListQuerySchema.safeParse({ pageSize: "500" }).success,
    ).toBe(false);
    expect(
      ApplicationListQuerySchema.safeParse({ pageSize: "0" }).success,
    ).toBe(false);
    expect(ApplicationListQuerySchema.safeParse({ page: "abc" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid status or date", () => {
    expect(
      ApplicationListQuerySchema.safeParse({ status: "pending" }).success,
    ).toBe(false);
    expect(
      ApplicationListQuerySchema.safeParse({ appliedFrom: "notadate" }).success,
    ).toBe(false);
  });
});
