import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      role: Role;
      email: string;
      department: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
