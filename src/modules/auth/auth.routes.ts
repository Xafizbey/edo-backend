import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '../../utils/zod';
import { loginSchema, registerSchema } from './auth.schemas';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), asyncHandler(controller.register));
authRouter.post('/login', validate(loginSchema), asyncHandler(controller.login));
authRouter.get('/me', authenticate, asyncHandler(controller.me));
