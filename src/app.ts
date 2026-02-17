import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { approvalsRouter } from './modules/approvals/approvals.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { errorHandler, notFoundHandler } from './utils/errors';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: ['http://localhost:3000', 'https://edo-webpanel.vercel.app'],
      credentials: true
    })
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/audit', auditRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
