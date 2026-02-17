import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorizeRoles';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../utils/zod';
import { listAudit } from './audit.controller';
import { auditListSchema } from './audit.schemas';

export const auditRouter = Router();

auditRouter.use(authenticate, authorizeRoles(Role.ADMIN));
auditRouter.get('/', validate(auditListSchema), asyncHandler(listAudit));
