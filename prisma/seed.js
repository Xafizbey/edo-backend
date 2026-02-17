"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../src/config/prisma");
const main = async () => {
    const [adminPass, approverPass, userPass] = await Promise.all([
        bcrypt_1.default.hash('Admin123!', 10),
        bcrypt_1.default.hash('Approver123!', 10),
        bcrypt_1.default.hash('User123!', 10)
    ]);
    const admin = await prisma_1.prisma.user.upsert({
        where: { email: 'admin@edo.local' },
        update: {
            fullName: 'System Admin',
            passwordHash: adminPass,
            role: client_1.Role.ADMIN,
            department: 'Management'
        },
        create: {
            fullName: 'System Admin',
            email: 'admin@edo.local',
            passwordHash: adminPass,
            role: client_1.Role.ADMIN,
            department: 'Management'
        }
    });
    const approver = await prisma_1.prisma.user.upsert({
        where: { email: 'approver@edo.local' },
        update: {
            fullName: 'Main Approver',
            passwordHash: approverPass,
            role: client_1.Role.APPROVER,
            department: 'IT'
        },
        create: {
            fullName: 'Main Approver',
            email: 'approver@edo.local',
            passwordHash: approverPass,
            role: client_1.Role.APPROVER,
            department: 'IT'
        }
    });
    const user = await prisma_1.prisma.user.upsert({
        where: { email: 'user@edo.local' },
        update: {
            fullName: 'Regular User',
            passwordHash: userPass,
            role: client_1.Role.USER,
            department: 'IT'
        },
        create: {
            fullName: 'Regular User',
            email: 'user@edo.local',
            passwordHash: userPass,
            role: client_1.Role.USER,
            department: 'IT'
        }
    });
    await prisma_1.prisma.auditLog.deleteMany();
    await prisma_1.prisma.approvalStep.deleteMany();
    await prisma_1.prisma.document.deleteMany();
    const seededDocs = [
        {
            type: client_1.DocumentType.LEAVE_REQUEST,
            title: 'Отпуск в мае',
            bodyJson: { startDate: '2026-05-12', endDate: '2026-05-20', reason: 'Отдых' },
            status: client_1.DocumentStatus.APPROVED,
            currentStep: 2
        },
        {
            type: client_1.DocumentType.BUSINESS_TRIP,
            title: 'Командировка в Алматы',
            bodyJson: { destination: 'Алматы', fromDate: '2026-03-10', budget: '1200' },
            status: client_1.DocumentStatus.IN_REVIEW,
            currentStep: 1
        },
        {
            type: client_1.DocumentType.PURCHASE_REQUEST,
            title: 'Закупка ноутбуков',
            bodyJson: { item: 'Laptop x5', amount: '6500', vendor: 'TechMarket' },
            status: client_1.DocumentStatus.REJECTED,
            currentStep: 1
        },
        {
            type: client_1.DocumentType.LEAVE_REQUEST,
            title: 'Краткий отпуск',
            bodyJson: { startDate: '2026-04-02', endDate: '2026-04-04', reason: 'Личные дела' },
            status: client_1.DocumentStatus.CHANGES_REQUESTED,
            currentStep: 0
        },
        {
            type: client_1.DocumentType.BUSINESS_TRIP,
            title: 'Выезд к заказчику',
            bodyJson: { destination: 'Астана', fromDate: '2026-04-15', budget: '800' },
            status: client_1.DocumentStatus.DRAFT,
            currentStep: 0
        },
        {
            type: client_1.DocumentType.PURCHASE_REQUEST,
            title: 'Закупка принтера',
            bodyJson: { item: 'Printer', amount: '400', vendor: 'OfficeShop' },
            status: client_1.DocumentStatus.ARCHIVED,
            currentStep: 2
        }
    ];
    for (const entry of seededDocs) {
        const doc = await prisma_1.prisma.document.create({
            data: {
                type: entry.type,
                title: entry.title,
                bodyJson: entry.bodyJson,
                authorId: user.id,
                status: entry.status,
                currentStep: entry.currentStep
            }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                documentId: doc.id,
                actorId: user.id,
                actionType: 'DOCUMENT_CREATED',
                metaJson: { seeded: true, status: entry.status }
            }
        });
        if (entry.status !== client_1.DocumentStatus.DRAFT) {
            await prisma_1.prisma.approvalStep.createMany({
                data: [
                    {
                        documentId: doc.id,
                        order: 1,
                        approverId: approver.id,
                        decisionStatus: entry.status === client_1.DocumentStatus.IN_REVIEW
                            ? client_1.DecisionStatus.PENDING
                            : entry.status === client_1.DocumentStatus.REJECTED
                                ? client_1.DecisionStatus.REJECTED
                                : entry.status === client_1.DocumentStatus.CHANGES_REQUESTED
                                    ? client_1.DecisionStatus.CHANGES_REQUESTED
                                    : client_1.DecisionStatus.APPROVED,
                        comment: entry.status === client_1.DocumentStatus.REJECTED ? 'Недостаточно обоснования' : null,
                        decidedAt: entry.status === client_1.DocumentStatus.IN_REVIEW ? null : new Date()
                    },
                    {
                        documentId: doc.id,
                        order: 2,
                        approverId: admin.id,
                        decisionStatus: entry.status === client_1.DocumentStatus.APPROVED || entry.status === client_1.DocumentStatus.ARCHIVED
                            ? client_1.DecisionStatus.APPROVED
                            : client_1.DecisionStatus.PENDING,
                        decidedAt: entry.status === client_1.DocumentStatus.APPROVED || entry.status === client_1.DocumentStatus.ARCHIVED ? new Date() : null
                    }
                ]
            });
        }
        await prisma_1.prisma.auditLog.createMany({
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
    await prisma_1.prisma.$disconnect();
});
