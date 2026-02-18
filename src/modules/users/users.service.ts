import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import bcrypt from 'bcryptjs';

export const listUsers = async (q?: string) => {
  return prisma.user.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } }
          ]
        }
      : undefined,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      department: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const updateUserRole = async (id: string, role: Role) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, fullName: true, email: true, role: true, department: true }
  });
};

interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  department: string;
  role: Role;
}

export const createUser = async (input: CreateUserInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'Email already exists', 409);
  }

  const passwordHash = bcrypt.hashSync(input.password, 10);
  return prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      department: input.department,
      role: input.role
    },
    select: { id: true, fullName: true, email: true, role: true, department: true, createdAt: true }
  });
};
