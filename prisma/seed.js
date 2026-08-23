require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { toSlug } = require("../src/utils/slug");

const prisma = new PrismaClient();

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Roofing",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Gardening",
  "Handyman",
  "Flooring",
  "Heating",
  "Building",
  "Renovation",
  "Tiling",
  "Flat Pack",
];

const TOKEN_PACKAGES = [
  {
    name: "Starter",
    price: 30,
    tokenQuantity: 100,
    description: "Perfect for tradesmen getting started",
    badge: null,
  },
  {
    name: "Professional",
    price: 120,
    tokenQuantity: 500,
    description: "Best value for active tradesmen",
    badge: "Most Popular",
  },
  {
    name: "Business",
    price: 200,
    tokenQuantity: 1000,
    description: "For established teams and high volume",
    badge: null,
  },
];

const TOKEN_RULES = [
  {
    name: "Small job",
    minBudget: 0,
    maxBudget: 999,
    tokenCost: 8,
    description: "Lead cost for jobs under £1,000",
  },
  {
    name: "Standard job",
    minBudget: 1000,
    maxBudget: 4999,
    tokenCost: 14,
    description: "Lead cost for mid-range jobs",
  },
  {
    name: "Large job",
    minBudget: 5000,
    maxBudget: 999999,
    tokenCost: 25,
    description: "Lead cost for high-value jobs",
  },
];

async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: toSlug(name) },
      update: { name },
      create: { name, slug: toSlug(name) },
    });
  }

  for (const pkg of TOKEN_PACKAGES) {
    const existing = await prisma.tokenPackage.findFirst({
      where: { name: pkg.name },
    });
    if (!existing) {
      await prisma.tokenPackage.create({ data: pkg });
    }
  }

  for (const rule of TOKEN_RULES) {
    const existing = await prisma.tokenRule.findFirst({
      where: { name: rule.name },
    });
    if (!existing) {
      await prisma.tokenRule.create({ data: rule });
    }
  }

  console.log("Seed complete: categories, token packages, and token rules");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
