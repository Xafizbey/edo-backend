import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getMetrics = async (_req: Request, res: Response) => {
  const [statusCountsRaw, typeCountsRaw] = await Promise.all([
    prisma.document.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.document.groupBy({ by: ['type'], _count: { _all: true } })
  ]);

  const statusCounts = statusCountsRaw.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});
  const typeCounts = typeCountsRaw.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = row._count._all;
    return acc;
  }, {});

  res.json({ statusCounts, typeCounts });
};
