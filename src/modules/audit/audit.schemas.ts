import { z } from 'zod';

export const auditListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});
