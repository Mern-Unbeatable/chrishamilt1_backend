const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toNumber } = require("../utils/user");
const { serializeTradesman, serializeCustomer } = require("../utils/serialize");

const quoteInclude = {
  images: true,
  job: {
    include: {
      category: true,
      customer: true,
    },
  },
  tradesman: {
    include: { tradesmanProfile: true },
  },
};

const serializeQuote = (quote, { preview = false, includeCustomerContact = false } = {}) => {
  if (!quote) return null;

  return {
    id: quote.id,
    jobId: quote.jobId,
    tradesmanId: quote.tradesmanId,
    amount: toNumber(quote.amount),
    estimatedDuration: quote.estimatedDuration,
    startDate: quote.startDate,
    materialsIncluded: quote.materialsIncluded,
    warranty: quote.warranty,
    proposal: preview ? undefined : quote.proposal,
    proposalPreview: quote.proposal ? quote.proposal.slice(0, 180) : "",
    status: quote.status,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    images: quote.images || [],
    job: quote.job
      ? {
          id: quote.job.id,
          jobCode: quote.job.jobCode,
          title: quote.job.title,
          location: quote.job.location,
          city: quote.job.city,
          status: quote.job.status,
          urgency: quote.job.urgency,
          budgetMin: toNumber(quote.job.budgetMin),
          budgetMax: toNumber(quote.job.budgetMax),
          leadPrice: toNumber(quote.job.leadPrice),
          category: quote.job.category,
          customer: serializeCustomer(quote.job.customer, {
            includeContact: includeCustomerContact,
          }),
        }
      : undefined,
    tradesman: serializeTradesman(quote.tradesman),
  };
};

const assertCanViewQuote = (quote, viewer) => {
  if (!viewer) {
    throw new ApiError(401, "Authentication required");
  }
  if (viewer.role === "ADMIN") return;
  if (viewer.id === quote.tradesmanId) return;
  if (quote.job && viewer.id === quote.job.customerId) return;
  throw new ApiError(403, "You cannot view this quote");
};

const resolveTokenCost = (job) => {
  const cost = Number(job.leadPrice);
  return Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 14;
};

const createQuote = async (tradesmanId, jobId, payload) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (job.status !== "OPEN") {
    throw new ApiError(400, "Quotes can only be sent on open jobs");
  }
  if (job.customerId === tradesmanId) {
    throw new ApiError(400, "You cannot quote on your own job");
  }

  const existing = await prisma.quote.findUnique({
    where: { jobId_tradesmanId: { jobId, tradesmanId } },
  });
  if (existing) {
    throw new ApiError(409, "You have already sent a quote for this job");
  }

  const tokenCost = resolveTokenCost(job);
  const images = payload.images || [];

  const created = await prisma.$transaction(async (tx) => {
    const tradesman = await tx.user.findUnique({
      where: { id: tradesmanId },
      select: { tokenBalance: true },
    });
    if (tradesman.tokenBalance < tokenCost) {
      throw new ApiError(
        400,
        `Not enough tokens. This lead costs ${tokenCost} tokens`
      );
    }

    await tx.user.update({
      where: { id: tradesmanId },
      data: { tokenBalance: { decrement: tokenCost } },
    });

    await tx.tokenUsage.create({
      data: {
        tradesmanId,
        jobId,
        tokens: tokenCost,
        reason: "QUOTE",
      },
    });

    return tx.quote.create({
      data: {
        jobId,
        tradesmanId,
        amount: payload.amount,
        estimatedDuration: payload.estimatedDuration,
        startDate: new Date(payload.startDate),
        materialsIncluded:
          payload.materialsIncluded === undefined
            ? false
            : Boolean(payload.materialsIncluded),
        warranty: payload.warranty || null,
        proposal: payload.proposal || "",
        images: images.length ? { create: images.map((url) => ({ url })) } : undefined,
      },
      select: { id: true },
    });
  });

  const quote = await prisma.quote.findUnique({
    where: { id: created.id },
    include: quoteInclude,
  });

  return serializeQuote(quote, { includeCustomerContact: true });
};

const updateQuote = async (quoteId, tradesmanId, payload) => {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    throw new ApiError(404, "Quote not found");
  }
  if (quote.tradesmanId !== tradesmanId) {
    throw new ApiError(403, "You can only update your own quotes");
  }
  if (quote.status !== "SUBMITTED") {
    throw new ApiError(400, "Only submitted quotes can be updated");
  }

  const data = {
    amount: payload.amount,
    estimatedDuration: payload.estimatedDuration,
    startDate: payload.startDate ? new Date(payload.startDate) : undefined,
    materialsIncluded: payload.materialsIncluded,
    warranty: payload.warranty,
    proposal: payload.proposal,
  };
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) delete data[key];
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (payload.images) {
      await tx.quoteImage.deleteMany({ where: { quoteId } });
      if (payload.images.length) {
        await tx.quoteImage.createMany({
          data: payload.images.map((url) => ({ quoteId, url })),
        });
      }
    }

    return tx.quote.update({
      where: { id: quoteId },
      data,
      include: quoteInclude,
    });
  });

  return serializeQuote(updated, { includeCustomerContact: true });
};

const withdrawQuote = async (quoteId, tradesmanId) => {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    throw new ApiError(404, "Quote not found");
  }
  if (quote.tradesmanId !== tradesmanId) {
    throw new ApiError(403, "You can only withdraw your own quotes");
  }
  if (quote.status !== "SUBMITTED") {
    throw new ApiError(400, "Only submitted quotes can be withdrawn");
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "WITHDRAWN" },
    include: quoteInclude,
  });

  return serializeQuote(updated, { includeCustomerContact: true });
};

const getMyQuotes = async (tradesmanId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = {
    tradesmanId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: quoteInclude,
    }),
    prisma.quote.count({ where }),
  ]);

  return {
    quotes: quotes.map((quote) =>
      serializeQuote(quote, { preview: true, includeCustomerContact: true })
    ),
    total,
    page,
    limit,
  };
};

const listJobQuotes = async (jobId, viewer) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const isAdmin = viewer.role === "ADMIN";
  const isOwner = viewer.id === job.customerId;
  const isTradesman = viewer.role === "TRADESMAN";

  if (!isAdmin && !isOwner && !isTradesman) {
    throw new ApiError(403, "You cannot view quotes on this job");
  }

  const quotes = await prisma.quote.findMany({
    where: {
      jobId,
      status: { not: "WITHDRAWN" },
      ...(isTradesman && !isAdmin && !isOwner ? { tradesmanId: viewer.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: quoteInclude,
  });

  return quotes.map((quote) =>
    serializeQuote(quote, {
      preview: true,
      includeCustomerContact: isTradesman && quote.tradesmanId === viewer.id,
    })
  );
};

const getQuoteById = async (quoteId, viewer) => {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: quoteInclude,
  });

  if (!quote) {
    throw new ApiError(404, "Quote not found");
  }

  assertCanViewQuote(quote, viewer);

  const reviews = await prisma.review.findMany({
    where: { tradesmanId: quote.tradesmanId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reviewer: {
        select: { id: true, fullName: true, firstName: true, profileImage: true },
      },
      job: { select: { id: true, title: true, category: true } },
    },
  });

  const includeCustomerContact = viewer.role === "ADMIN" || viewer.id === quote.tradesmanId;

  return {
    ...serializeQuote(quote, { includeCustomerContact }),
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reply: review.reply,
      repliedAt: review.repliedAt,
      createdAt: review.createdAt,
      reviewer: review.reviewer,
      job: review.job,
    })),
  };
};

module.exports = {
  createQuote,
  updateQuote,
  withdrawQuote,
  getMyQuotes,
  listJobQuotes,
  getQuoteById,
};
