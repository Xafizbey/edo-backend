import { Request, Response } from 'express';
import * as service from './approvals.service';

export const inbox = async (req: Request, res: Response) => {
  const result = await service.inbox(req.user!.userId);
  res.json(result);
};

export const decide = async (req: Request, res: Response) => {
  const result = await service.decide(
    req.params.stepId,
    { userId: req.user!.userId, role: req.user!.role },
    req.body
  );
  res.json(result);
};
