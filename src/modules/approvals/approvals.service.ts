import { DecisionStatus, DocumentStatus, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

interface Actor {
  userId: string;
  role: Role;
}

const decisionToStatus: Record<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES', DecisionStatus> = {
  APPROVE: DecisionStatus.APPROVED,
  REJECT: DecisionStatus.REJECTED,
  REQUEST_CHANGES: DecisionStatus.CHANGES_REQUESTED
};

export const inbox = async (actorId: string) => {
  return prisma.approvalStep.findMany({
    where: {
      approverId: actorId,
      decisionStatus: DecisionStatus.PENDING
    },
    include: {
      document: {
        include: {
          author: { select: { id: true, fullName: true, email: true, department: true, role: true } }
        }
      }
    },
    orderBy: { document: { updatedAt: 'desc' } }
  });
};

export const decide = async (
  stepId: string,
  actor: Actor,
  input: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'; comment?: string }
) => {
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: {
      document: true
    }
  });

  if (!step) {
    throw new AppError('STEP_NOT_FOUND', 'Approval step not found', 404);
  }

  if (step.approverId !== actor.userId && actor.role !== Role.ADMIN) {
    throw new AppError('FORBIDDEN', 'Step is not assigned to this user', 403);
  }

  if (step.decisionStatus !== DecisionStatus.PENDING) {
    throw new AppError('STEP_ALREADY_DECIDED', 'This step is already decided', 400);
  }

  return prisma.$transaction(async (tx) => {
    const updatedStep = await tx.approvalStep.update({
      where: { id: stepId },
      data: {
        decisionStatus: decisionToStatus[input.decision],
        comment: input.comment,
        decidedAt: new Date()
      }
    });

    const allSteps = await tx.approvalStep.findMany({
      where: { documentId: step.documentId },
      orderBy: { order: 'asc' }
    });

    const currentDoc = await tx.document.findUnique({ where: { id: step.documentId } });
    if (!currentDoc) {
      throw new AppError('DOC_NOT_FOUND', 'Document not found', 404);
    }

    let nextStatus = currentDoc.status;
    let nextCurrentStep = currentDoc.currentStep;

    if (input.decision === 'REJECT') {
      nextStatus = DocumentStatus.REJECTED;
    } else if (input.decision === 'REQUEST_CHANGES') {
      nextStatus = DocumentStatus.CHANGES_REQUESTED;
      nextCurrentStep = 0;
    } else {
      const pendingNext = allSteps.find((s) => s.decisionStatus === DecisionStatus.PENDING);
      if (pendingNext) {
        nextStatus = DocumentStatus.IN_REVIEW;
        nextCurrentStep = pendingNext.order;
      } else {
        nextStatus = DocumentStatus.APPROVED;
        nextCurrentStep = allSteps.length;
      }
    }

    const updatedDoc = await tx.document.update({
      where: { id: step.documentId },
      data: {
        status: nextStatus,
        currentStep: nextCurrentStep
      }
    });

    await tx.auditLog.create({
      data: {
        documentId: step.documentId,
        actorId: actor.userId,
        actionType: 'APPROVAL_DECIDED',
        metaJson: {
          stepId: step.id,
          order: step.order,
          decision: input.decision,
          comment: input.comment ?? null,
          documentStatus: nextStatus
        }
      }
    });

    return { step: updatedStep, document: updatedDoc };
  });
};
