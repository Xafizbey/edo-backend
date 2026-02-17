import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { signAccessToken } from '../../utils/jwt';

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  department: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const sanitizeUser = (user: { id: string; fullName: string; email: string; role: Role; department: string }) => user;

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'Email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      department: input.department,
      role: Role.USER
    }
  });

  const safeUser = sanitizeUser(user);
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    department: user.department
  });

  return { accessToken, user: safeUser };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const safeUser = sanitizeUser(user);
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    department: user.department
  });

  return { accessToken, user: safeUser };
};

export const me = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, department: true, createdAt: true }
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  return user;
};
