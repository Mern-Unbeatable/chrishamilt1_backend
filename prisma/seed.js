require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { toSlug } = require("../src/utils/slug");

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Plumbing", icon: "droplet" },
  { name: "Electrical", icon: "bolt" },
  { name: "Roofing", icon: "home" },
  { name: "Carpentry", icon: "hammer" },
  { name: "Painting", icon: "paintbrush" },
  { name: "Cleaning", icon: "sparkles" },
  { name: "Gardening", icon: "leaf" },
  { name: "Handyman", icon: "wrench" },
  { name: "Flooring", icon: "layers" },
  { name: "Heating", icon: "flame" },
  { name: "Building", icon: "hard-hat" },
  { name: "Renovation", icon: "truck" },
  { name: "Tiling", icon: "grid" },
  { name: "Flat Pack", icon: "box" },
];

const TOKEN_PACKAGES = [
  {
    name: "Starter",
    price: 30,
    tokenQuantity: 100,
    description: "Perfect for tradesmen getting started.",
    badge: null,
    stripePriceId: "price_1UBSnvPc4Do23EYoZc37LZnO",
  },
  {
    name: "Professional",
    price: 120,
    tokenQuantity: 500,
    description: "Best choice for growing businesses purchasing leads regularly.",
    badge: "Most Popular",
    stripePriceId: "price_1UBTDPPc4Do23EYoz3MQESKN",
  },
  {
    name: "Business",
    price: 200,
    tokenQuantity: 1000,
    description: "Maximum value for active tradesmen purchasing multiple leads every week.",
    badge: null,
    stripePriceId: "price_1UBTEVPc4Do23EYo0Cilg2hW",
  },
];

const TOKEN_RULES = [
  {
    name: "Under £1,000",
    minBudget: 0,
    maxBudget: 999,
    tokenCost: 10,
    description: "Jobs under £1,000",
    isActive: true,
  },
  {
    name: "£1,000 – £2,000",
    minBudget: 1000,
    maxBudget: 2000,
    tokenCost: 20,
    description: "Jobs from £1,000 to £2,000",
    isActive: true,
  },
  {
    name: "£2,000 – £3,000",
    minBudget: 2001,
    maxBudget: 3000,
    tokenCost: 30,
    description: "Jobs from £2,001 to £3,000",
    isActive: true,
  },
  {
    name: "£3,000 – £5,000",
    minBudget: 3001,
    maxBudget: 5000,
    tokenCost: 40,
    description: "Jobs from £3,001 to £5,000",
    isActive: true,
  },
  {
    name: "Above £5,000",
    minBudget: 5001,
    maxBudget: null,
    tokenCost: 50,
    description: "Jobs above £5,000",
    isActive: true,
  },
];

async function main() {
  for (const { name, icon } of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: toSlug(name) },
      update: { name, icon },
      create: { name, slug: toSlug(name), icon },
    });
  }

  for (const pkg of TOKEN_PACKAGES) {
    const existing = await prisma.tokenPackage.findFirst({
      where: { name: pkg.name },
    });
    if (existing) {
      await prisma.tokenPackage.update({
        where: { id: existing.id },
        data: {
          price: pkg.price,
          tokenQuantity: pkg.tokenQuantity,
          description: pkg.description,
          badge: pkg.badge,
          stripePriceId: pkg.stripePriceId,
          isActive: true,
        },
      });
    } else {
      await prisma.tokenPackage.create({ data: pkg });
    }
  }

  await prisma.tokenRule.deleteMany();
  for (const rule of TOKEN_RULES) {
    await prisma.tokenRule.create({ data: rule });
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
