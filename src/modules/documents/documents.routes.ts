import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorizeRoles';
import { validate } from '../../utils/zod';
import * as controller from './documents.controller';
import {
  createDocumentSchema,
  documentIdSchema,
  listAllDocumentsSchema,
  updateDocumentSchema
} from './documents.schemas';
import { asyncHandler } from '../../utils/asyncHandler';

export const documentsRouter = Router();

documentsRouter.use(authenticate);
documentsRouter.post(
  '/',
  authorizeRoles(Role.USER, Role.ADMIN),
  validate(createDocumentSchema),
  asyncHandler(controller.createDraft)
);
documentsRouter.get('/my', asyncHandler(controller.listMyDocuments));
documentsRouter.get(
  '/',
  authorizeRoles(Role.ADMIN),
  validate(listAllDocumentsSchema),
  asyncHandler(controller.listAllDocuments)
);
documentsRouter.get('/:id', validate(documentIdSchema), asyncHandler(controller.getDocumentById));
documentsRouter.patch('/:id', validate(updateDocumentSchema), asyncHandler(controller.updateDocument));
documentsRouter.post('/:id/submit', validate(documentIdSchema), asyncHandler(controller.submitDocument));
documentsRouter.get('/:id/timeline', validate(documentIdSchema), asyncHandler(controller.timeline));
documentsRouter.post(
  '/:id/archive',
  authorizeRoles(Role.ADMIN),
  validate(documentIdSchema),
  asyncHandler(controller.archiveDocument)
);
