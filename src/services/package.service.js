const prisma = require("../config/prisma");
const env = require("../config/env");
const { getStripe } = require("../config/stripe");
const ApiError = require("../utils/apiError");
const { toNumber } = require("../utils/user");

const POPULAR_BADGE = "Most Popular";

const serializePackage = (pkg, { includeStripe = false } = {}) => {
  if (!pkg) return null;
  return {
    id: pkg.id,
    name: pkg.name,
    price: toNumber(pkg.price),
    tokenQuantity: pkg.tokenQuantity,
    description: pkg.description,
    badge: pkg.badge,
    isPopular: Boolean(pkg.badge),
    isActive: pkg.isActive,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    ...(includeStripe ? { stripePriceId: pkg.stripePriceId } : {}),
  };
};

const statusLabel = (status) => {
  if (status === "COMPLETED") return "Paid";
  if (status === "FAILED") return "Failed";
  return "Pending";
};

const serializePurchase = (purchase) => ({
  id: purchase.id,
  packageId: purchase.packageId,
  tokens: purchase.tokens,
  amount: toNumber(purchase.amount),
  status: purchase.status,
  statusLabel: statusLabel(purchase.status),
  stripeSessionId: purchase.stripeSessionId,
  createdAt: purchase.createdAt,
  date: purchase.createdAt,
  package: purchase.package ? serializePackage(purchase.package) : undefined,
  packageName: purchase.package?.name || null,
  tradesman: purchase.tradesman
    ? {
        id: purchase.tradesman.id,
        fullName: purchase.tradesman.fullName,
        businessName: purchase.tradesman.tradesmanProfile?.businessName || null,
        email: purchase.tradesman.email,
      }
    : undefined,
  tradesmanName: purchase.tradesman
    ? purchase.tradesman.tradesmanProfile?.businessName
      ? `${purchase.tradesman.fullName} (${purchase.tradesman.tradesmanProfile.businessName})`
      : purchase.tradesman.fullName
    : null,
  tokenBalance: purchase.tokenBalance,
});

const resolveBadge = ({ badge, isPopular }) => {
  if (isPopular === true) return POPULAR_BADGE;
  if (isPopular === false) return null;
  if (badge === undefined) return undefined;
  return badge || null;
};

const listPublicPackages = async () => {
  const packages = await prisma.tokenPackage.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
  return packages.map((pkg) => serializePackage(pkg));
};

const listAdminPackages = async () => {
  const packages = await prisma.tokenPackage.findMany({
    orderBy: { price: "asc" },
    include: { _count: { select: { purchases: true } } },
  });
  return packages.map((pkg) => ({
    ...serializePackage(pkg, { includeStripe: true }),
    purchaseCount: pkg._count.purchases,
  }));
};

const createPackage = async (payload) => {
  if (payload.stripePriceId) {
    const taken = await prisma.tokenPackage.findUnique({
      where: { stripePriceId: payload.stripePriceId },
    });
    if (taken) {
      throw new ApiError(409, "This Stripe price is already linked to a package");
    }
  }

  const created = await prisma.tokenPackage.create({
    data: {
      name: payload.name,
      price: payload.price,
      tokenQuantity: payload.tokenQuantity,
      description: payload.description,
      badge: resolveBadge(payload) ?? null,
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
      stripePriceId: payload.stripePriceId || null,
    },
  });

  return serializePackage(created, { includeStripe: true });
};

const updatePackage = async (id, payload) => {
  const existing = await prisma.tokenPackage.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Package not found");
  }

  if (payload.stripePriceId) {
    const taken = await prisma.tokenPackage.findFirst({
      where: { stripePriceId: payload.stripePriceId, id: { not: id } },
    });
    if (taken) {
      throw new ApiError(409, "This Stripe price is already linked to a package");
    }
  }

  const data = {
    name: payload.name,
    price: payload.price,
    tokenQuantity: payload.tokenQuantity,
    description: payload.description,
    isActive: payload.isActive,
    stripePriceId: payload.stripePriceId,
    badge: resolveBadge(payload),
  };
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) delete data[key];
  });

  const updated = await prisma.tokenPackage.update({ where: { id }, data });
  return serializePackage(updated, { includeStripe: true });
};

const deletePackage = async (id) => {
  const existing = await prisma.tokenPackage.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true } } },
  });
  if (!existing) {
    throw new ApiError(404, "Package not found");
  }

  if (existing._count.purchases > 0) {
    const updated = await prisma.tokenPackage.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      deleted: false,
      deactivated: true,
      package: serializePackage(updated, { includeStripe: true }),
    };
  }

  await prisma.tokenPackage.delete({ where: { id } });
  return { deleted: true, deactivated: false };
};

const startCheckout = async (tradesman, packageId) => {
  if (tradesman.role !== "TRADESMAN") {
    throw new ApiError(403, "Only tradesmen can buy token packages");
  }

  const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) {
    throw new ApiError(404, "Package not found");
  }
  if (!pkg.stripePriceId) {
    throw new ApiError(400, "This package is not linked to a Stripe price");
  }

  const purchase = await prisma.tokenPurchase.create({
    data: {
      tradesmanId: tradesman.id,
      packageId: pkg.id,
      tokens: pkg.tokenQuantity,
      amount: pkg.price,
      status: "PENDING",
    },
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: tradesman.email,
    client_reference_id: purchase.id,
    line_items: [{ price: pkg.stripePriceId, quantity: 1 }],
    metadata: {
      purchaseId: purchase.id,
      tradesmanId: tradesman.id,
      packageId: pkg.id,
    },
    success_url: `${env.publicBaseUrl.replace(/\/$/, "")}/api/packages/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.stripeCancelUrl,
  });

  await prisma.tokenPurchase.update({
    where: { id: purchase.id },
    data: { stripeSessionId: session.id },
  });

  return {
    purchaseId: purchase.id,
    checkoutUrl: session.url,
    sessionId: session.id,
    publishableKey: env.stripePublishableKey,
  };
};

const fulfillPaidSession = async (session) => {
  if (!session || session.payment_status !== "paid") {
    throw new ApiError(400, "Payment is not completed yet");
  }

  const purchaseId = session.metadata?.purchaseId || session.client_reference_id;
  const purchase = purchaseId
    ? await prisma.tokenPurchase.findUnique({ where: { id: purchaseId } })
    : await prisma.tokenPurchase.findUnique({
        where: { stripeSessionId: session.id },
      });

  if (!purchase) {
    throw new ApiError(404, "Purchase not found");
  }

  if (purchase.status === "COMPLETED") {
    const user = await prisma.user.findUnique({
      where: { id: purchase.tradesmanId },
      select: { tokenBalance: true },
    });
    return {
      alreadyCompleted: true,
      purchase: serializePurchase({
        ...purchase,
        tokenBalance: user?.tokenBalance,
      }),
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const completed = await tx.tokenPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "COMPLETED",
        stripeSessionId: session.id,
      },
    });

    const user = await tx.user.update({
      where: { id: purchase.tradesmanId },
      data: { tokenBalance: { increment: purchase.tokens } },
      select: { tokenBalance: true },
    });

    return { ...completed, tokenBalance: user.tokenBalance };
  });

  return {
    alreadyCompleted: false,
    purchase: serializePurchase(updated),
  };
};

const confirmCheckout = async (sessionId, viewer = null) => {
  if (!sessionId) {
    throw new ApiError(400, "sessionId is required");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (viewer && session.metadata?.tradesmanId && session.metadata.tradesmanId !== viewer.id) {
    throw new ApiError(403, "This payment does not belong to you");
  }

  return fulfillPaidSession(session);
};

const listMyPurchases = async (tradesmanId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    prisma.tokenPurchase.findMany({
      where: { tradesmanId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { package: true },
    }),
    prisma.tokenPurchase.count({ where: { tradesmanId } }),
  ]);

  return {
    purchases: purchases.map((item) => serializePurchase(item)),
    total,
    page,
    limit,
  };
};
// admin purchases list
const listAdminPurchases = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = String(query.search || "").trim();

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { tradesman: { fullName: { contains: search, mode: "insensitive" } } },
            {
              tradesman: {
                tradesmanProfile: { businessName: { contains: search, mode: "insensitive" } },
              },
            },
            { package: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
 // admin purchases list
  const [purchases, total] = await Promise.all([
    prisma.tokenPurchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        package: true,
        tradesman: { include: { tradesmanProfile: true } },
      },
    }),
    prisma.tokenPurchase.count({ where }),
  ]);

  return {
    purchases: purchases.map((item) => serializePurchase(item)),
    total,
    page,
    limit,
  };
};

module.exports = {
  listPublicPackages,
  listAdminPackages,
  createPackage,
  updatePackage,
  deletePackage,
  startCheckout,
  confirmCheckout,
  listMyPurchases,
  listAdminPurchases,
};
