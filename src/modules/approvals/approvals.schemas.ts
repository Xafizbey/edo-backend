import { z } from 'zod';

export const inboxSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
});

export const decideSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
    comment: z.string().max(500).optional()
  }),
  query: z.object({}),
  params: z.object({
    stepId: z.string().min(1)
  })
});
