import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Dates are computed relative to "now" rather than hardcoded, so the dashboard's
 * `hiredThisMonth` metric is meaningful whenever the seed is run. Everything else
 * is deterministic — no Math.random() — so `npm run db:seed` always produces the
 * same database.
 */
const NOW = new Date();
const Y = NOW.getUTCFullYear();
const M = NOW.getUTCMonth();

/** A day inside the CURRENT calendar month (day 1, so never in the future). */
const thisMonth = (hour: number): Date => new Date(Date.UTC(Y, M, 1, hour));

/** `n` months back, on the given day. Date.UTC handles negative months. */
const monthsAgo = (n: number, day: number, hour = 10): Date =>
  new Date(Date.UTC(Y, M - n, day, hour));

const candidates: Prisma.CandidateCreateInput[] = [
  {
    name: "Amara Perera",
    email: "amara.perera@example.com",
    phone: "+94 77 123 4567",
    location: "Colombo",
    linkedinUrl: "https://linkedin.com/in/amaraperera",
    notes: "Strong distributed-systems background. Available immediately.",
    applications: {
      create: [
        {
          jobTitle: "Senior Backend Engineer",
          company: "Initech",
          status: "hired",
          appliedAt: thisMonth(9),
          salaryExpectation: 4_200_000,
          currencyCode: "LKR",
          source: "referral",
          notes: "Offer accepted, starts next quarter.",
        },
        {
          jobTitle: "Platform Engineer",
          company: "Globex",
          status: "rejected",
          appliedAt: monthsAgo(2, 14),
          salaryExpectation: 3_800_000,
          currencyCode: "LKR",
          source: "linkedin",
        },
        {
          jobTitle: "Staff Engineer",
          company: "Hooli",
          status: "screening",
          appliedAt: monthsAgo(1, 8),
          currencyCode: "USD",
          source: "careers page",
        },
      ],
    },
  },
  {
    name: "Nuwan Silva",
    email: "nuwan.silva@example.com",
    phone: "+94 71 998 2211",
    location: "Kandy",
    notes: "Prefers remote. Two weeks notice.",
    applications: {
      create: [
        {
          jobTitle: "Full Stack Developer",
          company: "Vandelay Industries",
          status: "interview",
          appliedAt: monthsAgo(1, 22),
          salaryExpectation: 2_900_000,
          currencyCode: "LKR",
          source: "job board",
        },
        {
          jobTitle: "React Developer",
          company: "Umbrella Corp",
          status: "applied",
          appliedAt: monthsAgo(0, 3),
          currencyCode: "LKR",
        },
      ],
    },
  },
  {
    name: "Dilani Fernando",
    email: "dilani.fernando@example.com",
    phone: "+94 76 445 0912",
    location: "Galle",
    linkedinUrl: "https://linkedin.com/in/dilanifernando",
    applications: {
      create: [
        {
          jobTitle: "QA Automation Engineer",
          company: "Acme Corp",
          status: "offer",
          appliedAt: monthsAgo(1, 2),
          salaryExpectation: 2_400_000,
          currencyCode: "LKR",
          source: "recruiter",
          notes: "Negotiating start date.",
        },
        {
          jobTitle: "SDET",
          company: "Stark Industries",
          status: "rejected",
          appliedAt: monthsAgo(3, 19),
          currencyCode: "USD",
          source: "linkedin",
        },
        {
          jobTitle: "Test Lead",
          company: "Wayne Enterprises",
          status: "applied",
          appliedAt: monthsAgo(0, 4),
          salaryExpectation: 2_700_000,
          currencyCode: "LKR",
        },
      ],
    },
  },
  {
    name: "Ravi Jayasuriya",
    email: "ravi.jayasuriya@example.com",
    location: "Colombo",
    notes: "Referred by Amara Perera.",
    applications: {
      create: [
        {
          jobTitle: "DevOps Engineer",
          company: "Cyberdyne Systems",
          status: "hired",
          appliedAt: thisMonth(14),
          salaryExpectation: 3_600_000,
          currencyCode: "LKR",
          source: "referral",
        },
        {
          jobTitle: "SRE",
          company: "Initech",
          status: "rejected",
          appliedAt: monthsAgo(4, 11),
          currencyCode: "USD",
        },
      ],
    },
  },
  {
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+91 98450 22110",
    location: "Bengaluru",
    linkedinUrl: "https://linkedin.com/in/priyanair",
    notes: "Needs visa sponsorship for onsite roles.",
    applications: {
      create: [
        {
          jobTitle: "Machine Learning Engineer",
          company: "Soylent Corp",
          status: "interview",
          appliedAt: monthsAgo(0, 6),
          salaryExpectation: 95_000,
          currencyCode: "USD",
          source: "linkedin",
        },
        {
          jobTitle: "Data Scientist",
          company: "Tyrell Corp",
          status: "screening",
          appliedAt: monthsAgo(1, 27),
          salaryExpectation: 88_000,
          currencyCode: "USD",
        },
        {
          jobTitle: "Research Engineer",
          company: "Hooli",
          status: "rejected",
          appliedAt: monthsAgo(5, 9),
          currencyCode: "USD",
          source: "careers page",
        },
      ],
    },
  },
  {
    name: "Marcus Chen",
    email: "marcus.chen@example.com",
    phone: "+65 8123 4455",
    location: "Singapore",
    applications: {
      create: [
        {
          jobTitle: "Engineering Manager",
          company: "Globex",
          status: "offer",
          appliedAt: monthsAgo(0, 2),
          salaryExpectation: 180_000,
          currencyCode: "USD",
          source: "recruiter",
          notes: "Competing offer in hand.",
        },
        {
          jobTitle: "Head of Platform",
          company: "Wonka Industries",
          status: "interview",
          appliedAt: monthsAgo(1, 15),
          salaryExpectation: 195_000,
          currencyCode: "USD",
        },
      ],
    },
  },
  {
    name: "Elena Rossi",
    email: "elena.rossi@example.com",
    location: "Milan",
    linkedinUrl: "https://linkedin.com/in/elenarossi",
    notes: "Fluent in Italian, English, German.",
    applications: {
      create: [
        {
          jobTitle: "Frontend Engineer",
          company: "Vandelay Industries",
          status: "hired",
          appliedAt: monthsAgo(2, 5),
          salaryExpectation: 72_000,
          currencyCode: "EUR",
          source: "job board",
        },
        {
          jobTitle: "UI Engineer",
          company: "Acme Corp",
          status: "rejected",
          appliedAt: monthsAgo(4, 21),
          currencyCode: "EUR",
        },
        {
          jobTitle: "Design Systems Engineer",
          company: "Stark Industries",
          status: "applied",
          appliedAt: monthsAgo(0, 7),
          salaryExpectation: 78_000,
          currencyCode: "EUR",
          source: "linkedin",
        },
      ],
    },
  },
  {
    name: "Tomás Rivera",
    email: "tomas.rivera@example.com",
    phone: "+34 611 220 335",
    location: "Madrid",
    applications: {
      create: [
        {
          jobTitle: "Backend Engineer",
          company: "Umbrella Corp",
          status: "screening",
          appliedAt: monthsAgo(0, 8),
          salaryExpectation: 65_000,
          currencyCode: "EUR",
          source: "careers page",
        },
        {
          jobTitle: "Go Developer",
          company: "Cyberdyne Systems",
          status: "applied",
          appliedAt: monthsAgo(1, 12),
          currencyCode: "EUR",
        },
      ],
    },
  },
  {
    name: "Aisha Khan",
    email: "aisha.khan@example.com",
    phone: "+971 50 776 2211",
    location: "Dubai",
    linkedinUrl: "https://linkedin.com/in/aishakhan",
    notes: "Currently on a 3-month notice period.",
    applications: {
      create: [
        {
          jobTitle: "Product Engineer",
          company: "Wayne Enterprises",
          status: "interview",
          appliedAt: monthsAgo(1, 4),
          salaryExpectation: 120_000,
          currencyCode: "USD",
          source: "referral",
        },
        {
          jobTitle: "Solutions Architect",
          company: "Initech",
          status: "offer",
          appliedAt: monthsAgo(0, 5),
          salaryExpectation: 135_000,
          currencyCode: "USD",
        },
        {
          jobTitle: "Tech Lead",
          company: "Globex",
          status: "rejected",
          appliedAt: monthsAgo(3, 28),
          currencyCode: "USD",
          source: "linkedin",
        },
        {
          jobTitle: "Principal Engineer",
          company: "Hooli",
          status: "screening",
          appliedAt: monthsAgo(2, 17),
          salaryExpectation: 150_000,
          currencyCode: "USD",
        },
      ],
    },
  },
  {
    name: "Kevin O'Brien",
    email: "kevin.obrien@example.com",
    location: "Dublin",
    applications: {
      create: [
        {
          jobTitle: "Site Reliability Engineer",
          company: "Tyrell Corp",
          status: "applied",
          appliedAt: monthsAgo(0, 1),
          salaryExpectation: 85_000,
          currencyCode: "EUR",
          source: "job board",
        },
        {
          jobTitle: "Infrastructure Engineer",
          company: "Soylent Corp",
          status: "interview",
          appliedAt: monthsAgo(2, 23),
          currencyCode: "EUR",
          notes: "Panel scheduled for next week.",
        },
      ],
    },
  },
  {
    name: "Sofia Almeida",
    email: "sofia.almeida@example.com",
    phone: "+351 912 445 001",
    location: "Lisbon",
    linkedinUrl: "https://linkedin.com/in/sofiaalmeida",
    applications: {
      create: [
        {
          jobTitle: "Mobile Engineer",
          company: "Wonka Industries",
          status: "screening",
          appliedAt: monthsAgo(1, 9),
          salaryExpectation: 58_000,
          currencyCode: "EUR",
          source: "recruiter",
        },
        {
          jobTitle: "React Native Developer",
          company: "Acme Corp",
          status: "rejected",
          appliedAt: monthsAgo(5, 16),
          currencyCode: "EUR",
        },
        {
          jobTitle: "Flutter Developer",
          company: "Vandelay Industries",
          status: "applied",
          appliedAt: monthsAgo(0, 9),
          currencyCode: "EUR",
          source: "linkedin",
        },
      ],
    },
  },
  {
    name: "Hiroshi Tanaka",
    email: "hiroshi.tanaka@example.com",
    location: "Tokyo",
    notes: "Interested in staff-level IC roles only.",
    applications: {
      create: [
        {
          jobTitle: "Distributed Systems Engineer",
          company: "Stark Industries",
          status: "offer",
          appliedAt: monthsAgo(0, 6),
          salaryExpectation: 165_000,
          currencyCode: "USD",
          source: "referral",
          notes: "Verbal offer extended.",
        },
        {
          jobTitle: "Database Engineer",
          company: "Cyberdyne Systems",
          status: "interview",
          appliedAt: monthsAgo(1, 19),
          salaryExpectation: 158_000,
          currencyCode: "USD",
        },
      ],
    },
  },

  /**
   * Soft-deleted on purpose. Proves the `deletedAt IS NULL` filter is real:
   * this candidate must not appear in any list, detail, search or dashboard
   * metric — and neither must her two applications, which remain in the table.
   */
  {
    name: "Zara Deleted",
    email: "zara.deleted@example.com",
    location: "Colombo",
    notes: "Withdrew from the process — soft-deleted to demonstrate the filter.",
    deletedAt: new Date(),
    applications: {
      create: [
        {
          jobTitle: "Ghost Engineer",
          company: "Initech",
          status: "hired",
          appliedAt: thisMonth(11),
          currencyCode: "LKR",
        },
        {
          jobTitle: "Phantom Developer",
          company: "Globex",
          status: "rejected",
          appliedAt: monthsAgo(1, 6),
          currencyCode: "LKR",
        },
      ],
    },
  },
];

async function main(): Promise<void> {
  // Applications first: Candidate is the parent. (The FK cascades, but being
  // explicit keeps the intent obvious.)
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();

  for (const data of candidates) {
    await prisma.candidate.create({ data });
  }

  const [activeCandidates, allCandidates, activeApplications, allApplications] =
    await Promise.all([
      prisma.candidate.count({ where: { deletedAt: null } }),
      prisma.candidate.count(),
      prisma.application.count({ where: { candidate: { deletedAt: null } } }),
      prisma.application.count(),
    ]);

  const byStatus = await prisma.application.groupBy({
    by: ["status"],
    where: { candidate: { deletedAt: null } },
    _count: { _all: true },
  });

  console.log(
    `Seeded ${activeCandidates} active candidates (${allCandidates - activeCandidates} soft-deleted), ` +
      `${activeApplications} visible applications (${allApplications - activeApplications} hidden).`,
  );
  console.log(
    "Visible applications by status:",
    byStatus
      .map((g) => `${g.status}=${g._count._all}`)
      .sort()
      .join(" "),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
