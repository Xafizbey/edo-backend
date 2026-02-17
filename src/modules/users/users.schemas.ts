import { z } from 'zod';
import { Role } from '@prisma/client';

export const listUsersSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    q: z.string().optional()
  })
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role)
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({})
});

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    department: z.string().min(2),
    role: z.nativeEnum(Role)
  }),
  params: z.object({}),
  query: z.object({})
});
