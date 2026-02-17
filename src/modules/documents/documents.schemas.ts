import { DocumentStatus, DocumentType } from '@prisma/client';
import { z } from 'zod';

const bodyJsonSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export const createDocumentSchema = z.object({
  body: z.object({
    type: z.nativeEnum(DocumentType),
    title: z.string().min(3),
    bodyJson: bodyJsonSchema
  }),
  query: z.object({}),
  params: z.object({})
});

export const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    bodyJson: bodyJsonSchema.optional()
  }),
  query: z.object({}),
  params: z.object({
    id: z.string().min(1)
  })
});

export const documentIdSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().min(1)
  })
});

export const listAllDocumentsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    status: z.nativeEnum(DocumentStatus).optional(),
    type: z.nativeEnum(DocumentType).optional(),
    department: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
});
