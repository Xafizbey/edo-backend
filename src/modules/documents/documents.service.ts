import { DecisionStatus, DocumentStatus, DocumentType, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

interface Actor {
  userId: string;
  role: Role;
  department: string;
}

interface CreateDocumentInput {
  type: DocumentType;
  title: string;
  bodyJson: Record<string, string | number | boolean | null>;
}

interface UpdateDocumentInput {
  title?: string;
  bodyJson?: Record<string, string | number | boolean | null>;
}

interface ListAllFilters {
  status?: DocumentStatus;
  type?: DocumentType;
  department?: string;
  q?: string;
  page: number;
  pageSize: number;
}

const canAccessDocument = async (documentId: string, actor: Actor) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { author: true, approvalSteps: true }
  });

  if (!document) {
    throw new AppError('DOC_NOT_FOUND', 'Document not found', 404);
  }

  const isAuthor = document.authorId === actor.userId;
  const isAdmin = actor.role === Role.ADMIN;
  const isApprover = document.approvalSteps.some((s) => s.approverId === actor.userId);

  if (!isAuthor && !isAdmin && !isApprover) {
    throw new AppError('FORBIDDEN', 'No access to this document', 403);
  }

  return document;
};

const addAudit = async (
  tx: Prisma.TransactionClient,
  documentId: string,
  actorId: string,
  actionType: string,
  metaJson?: Prisma.InputJsonValue
) => {
  await tx.auditLog.create({
    data: {
      documentId,
      actorId,
      actionType,
      metaJson
    }
  });
};

const pickApproversForDepartment = async (department: string) => {
  const departmentApprover = await prisma.user.findFirst({
    where: { role: Role.APPROVER, department },
    orderBy: { createdAt: 'asc' }
  });

  const fallbackApprover = departmentApprover
    ? departmentApprover
    : await prisma.user.findFirst({ where: { role: Role.APPROVER }, orderBy: { createdAt: 'asc' } });

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN }, orderBy: { createdAt: 'asc' } });

  if (!fallbackApprover || !admin) {
    throw new AppError('APPROVER_ROUTE_MISSING', 'Approver or admin is missing. Run seed.', 400);
  }

  return { step1ApproverId: fallbackApprover.id, step2ApproverId: admin.id };
};

export const createDraft = async (input: CreateDocumentInput, actor: Actor) => {
  const doc = await prisma.document.create({
    data: {
      type: input.type,
      title: input.title,
      bodyJson: input.bodyJson,
      authorId: actor.userId,
      status: DocumentStatus.DRAFT,
      currentStep: 0
    }
  });

  await prisma.auditLog.create({
    data: {
      documentId: doc.id,
      actorId: actor.userId,
      actionType: 'DOCUMENT_CREATED',
      metaJson: { status: DocumentStatus.DRAFT }
    }
  });

  return doc;
};

export const listMyDocuments = async (actorId: string) => {
  return prisma.document.findMany({
    where: { authorId: actorId },
    include: {
      author: { select: { id: true, fullName: true, email: true, department: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });
};

export const listAllDocuments = async (filters: ListAllFilters) => {
  const where: Prisma.DocumentWhereInput = {
    status: filters.status,
    type: filters.type,
    title: filters.q ? { contains: filters.q, mode: 'insensitive' } : undefined,
    author: filters.department ? { department: filters.department } : undefined
  };
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        author: { select: { id: true, fullName: true, email: true, department: true } }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: filters.pageSize
    }),
    prisma.document.count({ where })
  ]);

  return {
    items,
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
    }
  };
};

export const getDocumentById = async (documentId: string, actor: Actor) => {
  await canAccessDocument(documentId, actor);

  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      author: { select: { id: true, fullName: true, email: true, department: true, role: true } },
      approvalSteps: {
        include: { approver: { select: { id: true, fullName: true, email: true, role: true, department: true } } },
        orderBy: { order: 'asc' }
      }
    }
  });
};

export const updateDocument = async (documentId: string, actor: Actor, input: UpdateDocumentInput) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    throw new AppError('DOC_NOT_FOUND', 'Document not found', 404);
  }

  if (doc.authorId !== actor.userId) {
    throw new AppError('FORBIDDEN', 'Only author can edit', 403);
  }

  if (![DocumentStatus.DRAFT, DocumentStatus.CHANGES_REQUESTED].includes(doc.status)) {
    throw new AppError('INVALID_STATUS', 'Can only edit DRAFT or CHANGES_REQUESTED documents', 400);
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      title: input.title ?? doc.title,
      bodyJson: input.bodyJson ?? (doc.bodyJson as Prisma.InputJsonValue)
    }
  });

  await prisma.auditLog.create({
    data: {
      documentId,
      actorId: actor.userId,
      actionType: 'DOCUMENT_UPDATED',
      metaJson: { changedTitle: Boolean(input.title), changedBody: Boolean(input.bodyJson) }
    }
  });

  return updated;
};

export const submitDocument = async (documentId: string, actor: Actor) => {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { author: true }
  });

  if (!doc) {
    throw new AppError('DOC_NOT_FOUND', 'Document not found', 404);
  }

  if (doc.authorId !== actor.userId) {
    throw new AppError('FORBIDDEN', 'Only author can submit', 403);
  }

  if (![DocumentStatus.DRAFT, DocumentStatus.CHANGES_REQUESTED].includes(doc.status)) {
    throw new AppError('INVALID_STATUS', 'Can only submit DRAFT or CHANGES_REQUESTED documents', 400);
  }

  const route = await pickApproversForDepartment(doc.author.department);

  return prisma.$transaction(async (tx) => {
    await tx.approvalStep.deleteMany({ where: { documentId } });

    await tx.approvalStep.createMany({
      data: [
        { documentId, order: 1, approverId: route.step1ApproverId, decisionStatus: DecisionStatus.PENDING },
        { documentId, order: 2, approverId: route.step2ApproverId, decisionStatus: DecisionStatus.PENDING }
      ]
    });

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.IN_REVIEW, currentStep: 1 }
    });

    await addAudit(tx, documentId, actor.userId, 'DOCUMENT_SUBMITTED', { status: DocumentStatus.SUBMITTED });
    await addAudit(tx, documentId, actor.userId, 'DOCUMENT_IN_REVIEW', {
      currentStep: 1,
      route: [route.step1ApproverId, route.step2ApproverId]
    });

    return updated;
  });
};

export const timeline = async (documentId: string, actor: Actor) => {
  await canAccessDocument(documentId, actor);

  const [steps, audits] = await Promise.all([
    prisma.approvalStep.findMany({
      where: { documentId },
      include: {
        approver: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { order: 'asc' }
    }),
    prisma.auditLog.findMany({
      where: { documentId },
      include: {
        actor: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  return { approvalSteps: steps, auditLogs: audits };
};

export const archiveDocument = async (documentId: string, actorId: string) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    throw new AppError('DOC_NOT_FOUND', 'Document not found', 404);
  }
  if (![DocumentStatus.APPROVED, DocumentStatus.REJECTED].includes(doc.status)) {
    throw new AppError('INVALID_STATUS', 'Only APPROVED or REJECTED documents can be archived', 400);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.ARCHIVED }
    });
    await addAudit(tx, documentId, actorId, 'DOCUMENT_ARCHIVED', { fromStatus: doc.status, toStatus: 'ARCHIVED' });
    return updated;
  });
};
