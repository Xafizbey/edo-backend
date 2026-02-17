import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorizeRoles';
import { validate } from '../../utils/zod';
import * as controller from './approvals.controller';
import { decideSchema, inboxSchema } from './approvals.schemas';
import { asyncHandler } from '../../utils/asyncHandler';

export const approvalsRouter = Router();

approvalsRouter.use(authenticate, authorizeRoles(Role.APPROVER, Role.ADMIN));
approvalsRouter.get('/inbox', validate(inboxSchema), asyncHandler(controller.inbox));
approvalsRouter.post('/:stepId/decision', validate(decideSchema), asyncHandler(controller.decide));
