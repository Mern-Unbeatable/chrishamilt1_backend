const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { nextJobCode } = require("../utils/jobCode");
const { toNumber } = require("../utils/user");
const tokenRuleService = require("./tokenRule.service");
const { ensureConversation } = require("./conversation.service");

const JOB_UNLOCK_REASONS = ["JOB_VIEW", "QUOTE"];

const serializeJob = (job, { includeContact = false, unlocked = false } = {}) => {
  if (!job) return null;

  const customer = job.customer
    ? {
        id: job.customer.id,
        fullName: job.customer.fullName,
        firstName: job.customer.firstName,
        profileImage: job.customer.profileImage,
        ...(includeContact
          ? {
              email: job.customer.email,
              phoneNumber: job.customer.phoneNumber,
            }
          : {}),
      }
    : undefined;

  return {
    ...job,
    budgetMin: toNumber(job.budgetMin),
    budgetMax: toNumber(job.budgetMax),
    leadPrice: toNumber(job.leadPrice),
    unlocked,
    customer,
    tradesman: job.tradesman
      ? {
          id: job.tradesman.id,
          fullName: job.tradesman.fullName,
          profileImage: job.tradesman.profileImage,
          tradesmanProfile: job.tradesman.tradesmanProfile || null,
        }
      : job.tradesman,
  };
};

const generateJobCode = async () => {
  const last = await prisma.job.findFirst({
    orderBy: { createdAt: "desc" },
    select: { jobCode: true },
  });
  return nextJobCode(last?.jobCode);
};

const resolveLeadPrice = (budgetMax) => tokenRuleService.resolveLeadPrice(budgetMax);

const canViewContact = (viewer, job, unlocked = false) => {
  if (!viewer) return false;
  if (viewer.role === "ADMIN") return true;
  if (viewer.id === job.customerId) return true;
  if (viewer.role === "TRADESMAN" && (unlocked || viewer.id === job.tradesmanId)) return true;
  return false;
};

const jobTokenCost = async (job) => {
  const stored = Number(job.leadPrice);
  if (Number.isFinite(stored) && stored > 0) {
    return Math.round(stored);
  }
  return tokenRuleService.resolveLeadPrice(job.budgetMax);
};

const findJobUnlock = async (db, tradesmanId, jobId) => {
  return db.tokenUsage.findFirst({
    where: {
      tradesmanId,
      jobId,
      reason: { in: JOB_UNLOCK_REASONS },
    },
    select: { id: true, tokens: true },
  });
};

const serializePurchasedJob = (job, purchasedAt) => {
  if (!job) return null;
  return {
    id: job.id,
    jobCode: job.jobCode,
    title: job.title,
    location: job.location,
    city: job.city,
    status: job.status === "OPEN" ? "PURCHASED" : job.status,
    jobStatus: job.status,
    urgency: job.urgency,
    budgetMin: toNumber(job.budgetMin),
    budgetMax: toNumber(job.budgetMax),
    leadPrice: toNumber(job.leadPrice),
    customerName: job.customer?.fullName || null,
    customerId: job.customerId,
    category: job.category || null,
    purchasedAt,
  };
};

const listPurchasedJobs = async (tradesmanId) => {
  const usages = await prisma.tokenUsage.findMany({
    where: {
      tradesmanId,
      jobId: { not: null },
      reason: { in: JOB_UNLOCK_REASONS },
    },
    orderBy: { createdAt: "desc" },
    include: {
      job: {
        include: {
          category: true,
          customer: true,
        },
      },
    },
  });

  const seen = new Set();
  return usages
    .filter((row) => {
      if (!row.job || seen.has(row.jobId)) return false;
      seen.add(row.jobId);
      return true;
    })
    .map((row) => serializePurchasedJob(row.job, row.createdAt));
};

const openJobConversation = async (job, tradesmanId) => {
  if (!job?.customerId || !tradesmanId || job.customerId === tradesmanId) {
    return null;
  }

  return ensureConversation({
    customerId: job.customerId,
    tradesmanId,
    jobId: job.id,
  });
};

const unlockJobForTradesman = async (job, tradesmanId) => {
  const existing = await findJobUnlock(prisma, tradesmanId, job.id);
  if (existing) {
    const [user, conversation] = await Promise.all([
      prisma.user.findUnique({
        where: { id: tradesmanId },
        select: { tokenBalance: true },
      }),
      openJobConversation(job, tradesmanId),
    ]);
    return {
      unlocked: true,
      charged: false,
      tokensCharged: 0,
      tokensRequired: existing.tokens,
      tokenBalance: user?.tokenBalance || 0,
      conversationId: conversation?.id || null,
    };
  }

  const cost = await jobTokenCost(job);

  const access = await prisma.$transaction(async (tx) => {
    const again = await findJobUnlock(tx, tradesmanId, job.id);
    if (again) {
      const user = await tx.user.findUnique({
        where: { id: tradesmanId },
        select: { tokenBalance: true },
      });
      return {
        unlocked: true,
        charged: false,
        tokensCharged: 0,
        tokensRequired: again.tokens,
        tokenBalance: user?.tokenBalance || 0,
      };
    }

    const deducted = await tx.user.updateMany({
      where: { id: tradesmanId, tokenBalance: { gte: cost } },
      data: { tokenBalance: { decrement: cost } },
    });

    if (deducted.count === 0) {
      const user = await tx.user.findUnique({
        where: { id: tradesmanId },
        select: { tokenBalance: true },
      });
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      throw new ApiError(400, "Not enough tokens to view this job", {
        tokensRequired: cost,
        tokenBalance: user.tokenBalance || 0,
      });
    }

    const updated = await tx.user.findUnique({
      where: { id: tradesmanId },
      select: { tokenBalance: true },
    });

    await tx.tokenUsage.create({
      data: {
        tradesmanId,
        jobId: job.id,
        tokens: cost,
        reason: "JOB_VIEW",
      },
    });

    return {
      unlocked: true,
      charged: true,
      tokensCharged: cost,
      tokensRequired: cost,
      tokenBalance: updated?.tokenBalance || 0,
    };
  });

  const conversation = await openJobConversation(job, tradesmanId);
  return {
    ...access,
    conversationId: conversation?.id || null,
  };
};

const createJob = async (customerId, payload) => {
  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (Number(payload.budgetMax) < Number(payload.budgetMin)) {
    throw new ApiError(400, "budgetMax cannot be less than budgetMin");
  }

  const jobCode = await generateJobCode();
  const leadPrice = await resolveLeadPrice(payload.budgetMax);
  const { requirements = [], images = [] } = payload;

  const job = await prisma.job.create({
    data: {
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId,
      location: payload.location,
      city: payload.city,
      budgetMin: payload.budgetMin,
      budgetMax: payload.budgetMax,
      urgency: payload.urgency,
      specialNotes: payload.specialNotes,
      jobCode,
      customerId,
      leadPrice,
      preferredStart: payload.preferredStart ? new Date(payload.preferredStart) : undefined,
      completionBy: payload.completionBy ? new Date(payload.completionBy) : undefined,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : undefined,
      requirements: requirements.length
        ? { create: requirements.map((text) => ({ text })) }
        : undefined,
      images: images.length ? { create: images.map((url) => ({ url })) } : undefined,
    },
    include: {
      category: true,
      images: true,
      requirements: true,
      customer: true,
      _count: { select: { quotes: true } },
    },
  });

  return serializeJob(job, { includeContact: true, unlocked: true });
};

const browseJobs = async (query = {}, viewer = null) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where = {
    status: query.status || "OPEN",
    ...(query.urgency ? { urgency: query.urgency } : {}),
    ...(query.location
      ? { location: { contains: query.location, mode: "insensitive" } }
      : {}),
    ...(query.minBudget ? { budgetMax: { gte: Number(query.minBudget) } } : {}),
    ...(query.maxBudget ? { budgetMin: { lte: Number(query.maxBudget) } } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
            { location: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.category
      ? {
          category: {
            OR: [
              { id: query.category },
              { slug: query.category },
              { name: { equals: query.category, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: { take: 1 },
        customer: true,
        _count: { select: { quotes: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  let unlockedIds = new Set();
  if (viewer?.role === "TRADESMAN" && jobs.length) {
    const unlocks = await prisma.tokenUsage.findMany({
      where: {
        tradesmanId: viewer.id,
        jobId: { in: jobs.map((job) => job.id) },
        reason: { in: JOB_UNLOCK_REASONS },
      },
      select: { jobId: true },
    });
    unlockedIds = new Set(unlocks.map((row) => row.jobId));
  }

  return {
    jobs: jobs.map((job) => {
      const unlocked =
        viewer?.role === "ADMIN" ||
        viewer?.id === job.customerId ||
        unlockedIds.has(job.id) ||
        viewer?.id === job.tradesmanId;
      return serializeJob(job, {
        includeContact: canViewContact(viewer, job, unlocked),
        unlocked,
      });
    }),
    total,
    page,
    limit,
  };
};

const getJobById = async (id, viewer = null) => {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: true,
      images: true,
      requirements: true,
      customer: true,
      tradesman: { include: { tradesmanProfile: true } },
      _count: { select: { quotes: true } },
    },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const isOwner = viewer?.id === job.customerId;
  const isAdmin = viewer?.role === "ADMIN";
  const isAssigned = viewer?.role === "TRADESMAN" && viewer.id === job.tradesmanId;
  const shouldUnlock =
    viewer?.role === "TRADESMAN" && !isOwner && !isAdmin && !isAssigned;

  let access = {
    unlocked: isOwner || isAdmin || isAssigned,
    charged: false,
    tokensCharged: 0,
    tokensRequired: Number(job.leadPrice) || 0,
    tokenBalance: null,
    conversationId: null,
  };

  if (shouldUnlock) {
    access = await unlockJobForTradesman(job, viewer.id);
  } else if (isAssigned) {
    const conversation = await openJobConversation(job, viewer.id);
    access.conversationId = conversation?.id || null;
  }

  return {
    ...serializeJob(job, {
      includeContact: canViewContact(viewer, job, access.unlocked),
      unlocked: access.unlocked,
    }),
    tokensCharged: access.tokensCharged,
    tokensRequired: access.tokensRequired,
    tokenBalance: access.tokenBalance,
    conversationId: access.conversationId || null,
  };
};

const getMyJobs = async (customerId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where = {
    customerId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: { take: 1 },
        tradesman: { include: { tradesmanProfile: true } },
        _count: { select: { quotes: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs: jobs.map((job) => serializeJob(job, { includeContact: true, unlocked: true })),
    total,
    page,
    limit,
  };
};

const updateJob = async (id, actor, payload) => {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (actor.role !== "ADMIN" && job.customerId !== actor.id) {
    throw new ApiError(403, "You can only update your own job posts");
  }
  if (job.status !== "OPEN") {
    throw new ApiError(400, "Only open jobs can be updated");
  }

  const { requirements, images } = payload;
  const data = {
    title: payload.title,
    description: payload.description,
    categoryId: payload.categoryId,
    location: payload.location,
    city: payload.city,
    budgetMin: payload.budgetMin,
    budgetMax: payload.budgetMax,
    urgency: payload.urgency,
    specialNotes: payload.specialNotes,
    preferredStart: payload.preferredStart ? new Date(payload.preferredStart) : undefined,
    completionBy: payload.completionBy ? new Date(payload.completionBy) : undefined,
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : undefined,
  };

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) delete data[key];
  });

  if (payload.budgetMax !== undefined) {
    data.leadPrice = await resolveLeadPrice(payload.budgetMax);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (requirements) {
      await tx.jobRequirement.deleteMany({ where: { jobId: id } });
      if (requirements.length) {
        await tx.jobRequirement.createMany({
          data: requirements.map((text) => ({ jobId: id, text })),
        });
      }
    }

    if (images) {
      await tx.jobImage.deleteMany({ where: { jobId: id } });
      if (images.length) {
        await tx.jobImage.createMany({
          data: images.map((url) => ({ jobId: id, url })),
        });
      }
    }

    return tx.job.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
        requirements: true,
        customer: true,
        _count: { select: { quotes: true } },
      },
    });
  });

  return serializeJob(updated, { includeContact: true });
};

const cancelJob = async (id, actor) => {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (actor.role !== "ADMIN" && job.customerId !== actor.id) {
    throw new ApiError(403, "You can only cancel your own job posts");
  }
  if (["COMPLETED", "CANCELLED"].includes(job.status)) {
    throw new ApiError(400, "This job can no longer be cancelled");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.job.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        category: true,
        images: true,
        requirements: true,
        customer: true,
      },
    });

    await tx.booking.updateMany({
      where: { jobId: id, status: { not: "COMPLETED" } },
      data: { status: "CANCELLED" },
    });

    await tx.quote.updateMany({
      where: { jobId: id, status: "SUBMITTED" },
      data: { status: "WITHDRAWN" },
    });

    return cancelled;
  });

  return serializeJob(updated, { includeContact: true });
};

// Delete a job post
const deleteJob = async (id, actor) => {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (actor.role !== "ADMIN" && job.customerId !== actor.id) {
    throw new ApiError(403, "You can only delete your own job posts");
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.updateMany({
      where: { jobId: id },
      data: { jobId: null },
    });
    await tx.tokenUsage.updateMany({
      where: { jobId: id },
      data: { jobId: null },
    });
    await tx.earning.deleteMany({ where: { jobId: id } });
    await tx.review.deleteMany({ where: { jobId: id } });
    await tx.booking.deleteMany({ where: { jobId: id } });
    await tx.quote.deleteMany({ where: { jobId: id } });
    await tx.job.delete({ where: { id } });
  });

  return { id };
};

module.exports = {
  createJob,
  browseJobs,
  getJobById,
  getMyJobs,
  updateJob,
  cancelJob,
  deleteJob,
  unlockJobForTradesman,
  listPurchasedJobs,
};
