const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toNumber } = require("../utils/user");
const { serializeTradesman, serializeCustomer } = require("../utils/serialize");
const { ensureConversation } = require("./conversation.service");
const { getStripe } = require("../config/stripe");
const { countSubmittedQuotes, MAX_SUBMITTED_QUOTES, hasJobUnlocked } = require("./job.service");

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
    tokensCharged: quote.tokensCharged || null,
    amountPaid: toNumber(quote.amountPaid),
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
  if (existing && existing.status !== "PENDING_PAYMENT") {
    throw new ApiError(409, "You have already sent a quote for this job");
  }

  const submittedCount = await countSubmittedQuotes(jobId);
  if (submittedCount >= MAX_SUBMITTED_QUOTES) {
    throw new ApiError(400, "This job already has two quotations");
  }

  const purchased = await hasJobUnlocked(tradesmanId, jobId);
  if (!purchased) {
    throw new ApiError(400, "Buy this job before sending a quote");
  }
  const images = payload.images || [];
  const quoteData = {
    amount: payload.amount,
    estimatedDuration: payload.estimatedDuration,
    startDate: new Date(payload.startDate),
    materialsIncluded:
      payload.materialsIncluded === undefined ? false : Boolean(payload.materialsIncluded),
    warranty: payload.warranty || null,
    proposal: payload.proposal || "",
    status: "SUBMITTED",
    tokensCharged: Number(job.leadPrice) || 0,
    amountPaid: 0,
    stripeSessionId: null,
  };

  const saved = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM jobs WHERE id = CAST(${jobId} AS uuid) FOR UPDATE`;
    const liveCount = await countSubmittedQuotes(jobId, tx);
    if (liveCount >= MAX_SUBMITTED_QUOTES) {
      throw new ApiError(400, "This job already has two quotations");
    }

    let quote;
    if (existing) {
      await tx.quoteImage.deleteMany({ where: { quoteId: existing.id } });
      quote = await tx.quote.update({
        where: { id: existing.id },
        data: {
          ...quoteData,
          images: images.length ? { create: images.map((url) => ({ url })) } : undefined,
        },
        include: quoteInclude,
      });
    } else {
      quote = await tx.quote.create({
        data: {
          jobId,
          tradesmanId,
          ...quoteData,
          images: images.length ? { create: images.map((url) => ({ url })) } : undefined,
        },
        include: quoteInclude,
      });
    }
    return quote;
  });

  await ensureConversation({
    customerId: job.customerId,
    tradesmanId,
    jobId,
  });

  return {
    ...serializeQuote(saved, { includeCustomerContact: true }),
    tokensDeducted: 0,
  };
};

const fulfillPaidQuote = async (session) => {
  if (!session || session.payment_status !== "paid") {
    throw new ApiError(400, "Payment is not completed yet");
  }

  const quoteId = session.metadata?.quoteId || session.client_reference_id;
  const quote = quoteId
    ? await prisma.quote.findUnique({ where: { id: quoteId }, include: { job: true } })
    : await prisma.quote.findUnique({
        where: { stripeSessionId: session.id },
        include: { job: true },
      });

  if (!quote) {
    throw new ApiError(404, "Quote not found");
  }

  if (quote.status !== "PENDING_PAYMENT") {
    return {
      alreadyCompleted: true,
      quote: await prisma.quote.findUnique({
        where: { id: quote.id },
        include: quoteInclude,
      }),
    };
  }

  const tokensCharged = quote.tokensCharged || Number(session.metadata?.tokenCost) || 0;

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: "SUBMITTED",
        stripeSessionId: session.id,
      },
    });

    if (tokensCharged > 0) {
      await tx.tokenUsage.create({
        data: {
          tradesmanId: quote.tradesmanId,
          jobId: quote.jobId,
          tokens: tokensCharged,
          reason: "QUOTE",
        },
      });
    }
  });

  await ensureConversation({
    customerId: quote.job.customerId,
    tradesmanId: quote.tradesmanId,
    jobId: quote.jobId,
  });

  const submitted = await prisma.quote.findUnique({
    where: { id: quote.id },
    include: quoteInclude,
  });

  return { alreadyCompleted: false, quote: submitted };
};

const confirmQuoteCheckout = async (sessionId, viewer = null) => {
  if (!sessionId) {
    throw new ApiError(400, "sessionId is required");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (viewer && session.metadata?.tradesmanId && session.metadata.tradesmanId !== viewer.id) {
    throw new ApiError(403, "This payment does not belong to you");
  }

  return fulfillPaidQuote(session);
};

const updateQuote = async (quoteId, tradesmanId, payload) => {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    throw new ApiError(404, "Quote not found");
  }
  if (quote.tradesmanId !== tradesmanId) {
    throw new ApiError(403, "You can only update your own quotes");
  }
  if (!["SUBMITTED", "PENDING_PAYMENT"].includes(quote.status)) {
    throw new ApiError(400, "Only submitted or unpaid quotes can be updated");
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
  if (!["SUBMITTED", "PENDING_PAYMENT"].includes(quote.status)) {
    throw new ApiError(400, "Only submitted or unpaid quotes can be withdrawn");
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
      status: { notIn: ["WITHDRAWN", ...(isTradesman && !isOwner && !isAdmin ? [] : ["PENDING_PAYMENT"])] },
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
  confirmQuoteCheckout,
  updateQuote,
  withdrawQuote,
  getMyQuotes,
  listJobQuotes,
  getQuoteById,
};
