const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { nextJobCode } = require("../utils/jobCode");
const { toNumber } = require("../utils/user");
const tokenRuleService = require("./tokenRule.service");

const serializeJob = (job, { includeContact = false } = {}) => {
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

const canViewContact = (viewer, job) => {
  if (!viewer) return false;
  if (viewer.role === "ADMIN") return true;
  if (viewer.id === job.customerId) return true;
  if (viewer.role === "TRADESMAN") return true;
  return false;
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

  return serializeJob(job, { includeContact: true });
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

  return {
    jobs: jobs.map((job) =>
      serializeJob(job, { includeContact: canViewContact(viewer, job) })
    ),
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

  return serializeJob(job, { includeContact: canViewContact(viewer, job) });
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
    jobs: jobs.map((job) => serializeJob(job, { includeContact: true })),
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
};
