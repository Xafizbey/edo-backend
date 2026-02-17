import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorizeRoles';
import { getMetrics } from './admin.controller';
import { asyncHandler } from '../../utils/asyncHandler';

export const adminRouter = Router();

adminRouter.use(authenticate, authorizeRoles(Role.ADMIN));
adminRouter.get('/metrics', asyncHandler(getMetrics));
