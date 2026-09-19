require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const NEW_DATABASE_URL = process.env.DATABASE_URL;
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;

const TABLES = [
  { model: "user", label: "users" },
  { model: "category", label: "categories" },
  { model: "tokenPackage", label: "token_packages" },
  { model: "tokenRule", label: "token_rules" },
  { model: "tradesmanProfile", label: "tradesman_profiles" },
  { model: "warehouse", label: "warehouses" },
  { model: "job", label: "jobs" },
  { model: "jobImage", label: "job_images" },
  { model: "jobRequirement", label: "job_requirements" },
  { model: "quote", label: "quotes" },
  { model: "quoteImage", label: "quote_images" },
  { model: "booking", label: "bookings" },
  { model: "review", label: "reviews" },
  { model: "conversation", label: "conversations" },
  { model: "message", label: "messages" },
  { model: "tokenPurchase", label: "token_purchases" },
  { model: "tokenUsage", label: "token_usages" },
  { model: "earning", label: "earnings" },
];

const BATCH_SIZE = 200;

const createClient = (url) =>
  new PrismaClient({
    datasources: { db: { url } },
  });

const copyTable = async (oldDb, newDb, model, label) => {
  const rows = await oldDb[model].findMany();
  if (!rows.length) {
    console.log(`  ${label}: 0 rows`);
    return { label, copied: 0 };
  }

  let copied = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await newDb[model].createMany({
      data: batch,
      skipDuplicates: true,
    });
    copied += result.count;
  }

  console.log(`  ${label}: copied ${copied}/${rows.length}`);
  return { label, copied, total: rows.length };
};

const main = async () => {
  if (!NEW_DATABASE_URL || !OLD_DATABASE_URL) {
    throw new Error("DATABASE_URL and OLD_DATABASE_URL must be set");
  }

  const oldDb = createClient(OLD_DATABASE_URL);
  const newDb = createClient(NEW_DATABASE_URL);

  try {
    await oldDb.$connect();
    await newDb.$connect();
    console.log("Connected to old and new databases");

    for (const table of TABLES) {
      await copyTable(oldDb, newDb, table.model, table.label);
    }

    console.log("Copy finished");
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
