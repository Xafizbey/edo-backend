import { Router } from 'express';
import * as controller from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorizeRoles';
import { validate } from '../../utils/zod';
import { createUserSchema, listUsersSchema, updateRoleSchema } from './users.schemas';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';

export const usersRouter = Router();

usersRouter.use(authenticate, authorizeRoles(Role.ADMIN));
usersRouter.get('/', validate(listUsersSchema), asyncHandler(controller.listUsers));
usersRouter.post('/', validate(createUserSchema), asyncHandler(controller.createUser));
usersRouter.patch('/:id/role', validate(updateRoleSchema), asyncHandler(controller.updateRole));
usersRouter.post('/:id/role', validate(updateRoleSchema), asyncHandler(controller.updateRole));
