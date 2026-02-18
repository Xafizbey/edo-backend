import bcrypt from 'bcryptjs';
import { DecisionStatus, DocumentStatus, DocumentType, Role } from '@prisma/client';
import { prisma } from '../src/config/prisma';

const main = async () => {
  const [adminPass, approverPass, userPass] = [
    bcrypt.hashSync('Admin123!', 10),
    bcrypt.hashSync('Approver123!', 10),
    bcrypt.hashSync('User123!', 10)
  ];

  const admin = await prisma.user.upsert({
    where: { email: 'admin@edo.local' },
    update: {
      fullName: 'System Admin',
      passwordHash: adminPass,
      role: Role.ADMIN,
      department: 'Management'
    },
    create: {
      fullName: 'System Admin',
      email: 'admin@edo.local',
      passwordHash: adminPass,
      role: Role.ADMIN,
      department: 'Management'
    }
  });

  const approver = await prisma.user.upsert({
    where: { email: 'approver@edo.local' },
    update: {
      fullName: 'Main Approver',
      passwordHash: approverPass,
      role: Role.APPROVER,
      department: 'IT'
    },
    create: {
      fullName: 'Main Approver',
      email: 'approver@edo.local',
      passwordHash: approverPass,
      role: Role.APPROVER,
      department: 'IT'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@edo.local' },
    update: {
      fullName: 'Regular User',
      passwordHash: userPass,
      role: Role.USER,
      department: 'IT'
    },
    create: {
      fullName: 'Regular User',
      email: 'user@edo.local',
      passwordHash: userPass,
      role: Role.USER,
      department: 'IT'
    }
  });

  await prisma.auditLog.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.document.deleteMany();

  const seededDocs = [
    {
      type: DocumentType.LEAVE_REQUEST,
      title: 'Отпуск в мае',
      bodyJson: { startDate: '2026-05-12', endDate: '2026-05-20', reason: 'Отдых' },
      status: DocumentStatus.APPROVED,
      currentStep: 2
    },
    {
      type: DocumentType.BUSINESS_TRIP,
      title: 'Командировка в Алматы',
      bodyJson: { destination: 'Алматы', fromDate: '2026-03-10', budget: '1200' },
      status: DocumentStatus.IN_REVIEW,
      currentStep: 1
    },
    {
      type: DocumentType.PURCHASE_REQUEST,
      title: 'Закупка ноутбуков',
      bodyJson: { item: 'Laptop x5', amount: '6500', vendor: 'TechMarket' },
      status: DocumentStatus.REJECTED,
      currentStep: 1
    },
    {
      type: DocumentType.LEAVE_REQUEST,
      title: 'Краткий отпуск',
      bodyJson: { startDate: '2026-04-02', endDate: '2026-04-04', reason: 'Личные дела' },
      status: DocumentStatus.CHANGES_REQUESTED,
      currentStep: 0
    },
    {
      type: DocumentType.BUSINESS_TRIP,
      title: 'Выезд к заказчику',
      bodyJson: { destination: 'Астана', fromDate: '2026-04-15', budget: '800' },
      status: DocumentStatus.DRAFT,
      currentStep: 0
    },
    {
      type: DocumentType.PURCHASE_REQUEST,
      title: 'Закупка принтера',
      bodyJson: { item: 'Printer', amount: '400', vendor: 'OfficeShop' },
      status: DocumentStatus.ARCHIVED,
      currentStep: 2
    }
  ];

  for (const entry of seededDocs) {
    const doc = await prisma.document.create({
      data: {
        type: entry.type,
        title: entry.title,
        bodyJson: entry.bodyJson,
        authorId: user.id,
        status: entry.status,
        currentStep: entry.currentStep
      }
    });

    await prisma.auditLog.create({
      data: {
        documentId: doc.id,
        actorId: user.id,
        actionType: 'DOCUMENT_CREATED',
        metaJson: { seeded: true, status: entry.status }
      }
    });

    if (entry.status !== DocumentStatus.DRAFT) {
      await prisma.approvalStep.createMany({
        data: [
          {
            documentId: doc.id,
            order: 1,
            approverId: approver.id,
            decisionStatus:
              entry.status === DocumentStatus.IN_REVIEW
                ? DecisionStatus.PENDING
                : entry.status === DocumentStatus.REJECTED
                  ? DecisionStatus.REJECTED
                  : entry.status === DocumentStatus.CHANGES_REQUESTED
                    ? DecisionStatus.CHANGES_REQUESTED
                    : DecisionStatus.APPROVED,
            comment: entry.status === DocumentStatus.REJECTED ? 'Недостаточно обоснования' : null,
            decidedAt: entry.status === DocumentStatus.IN_REVIEW ? null : new Date()
          },
          {
            documentId: doc.id,
            order: 2,
            approverId: admin.id,
            decisionStatus:
              entry.status === DocumentStatus.APPROVED || entry.status === DocumentStatus.ARCHIVED
                ? DecisionStatus.APPROVED
                : DecisionStatus.PENDING,
            decidedAt: entry.status === DocumentStatus.APPROVED || entry.status === DocumentStatus.ARCHIVED ? new Date() : null
          }
        ]
      });
    }

    await prisma.auditLog.createMany({
      data: [
        {
          documentId: doc.id,
          actorId: approver.id,
          actionType: 'SEED_APPROVER_EVENT',
          metaJson: { status: entry.status }
        },
        {
          documentId: doc.id,
          actorId: admin.id,
          actionType: 'SEED_ADMIN_EVENT',
          metaJson: { status: entry.status }
        }
      ]
    });
  }

  console.log('Seed complete with demo users/documents/audit logs');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
