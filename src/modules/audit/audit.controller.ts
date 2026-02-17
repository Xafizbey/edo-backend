import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const listAudit = async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 20);

  const items = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          department: true
        }
      },
      document: {
        select: {
          id: true,
          title: true,
          status: true,
          type: true
        }
      }
    }
  });

  res.json(items);
};
