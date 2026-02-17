import { Request, Response } from 'express';
import * as service from './auth.service';

export const register = async (req: Request, res: Response) => {
  const result = await service.register(req.body);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const result = await service.login(req.body);
  res.json(result);
};

export const me = async (req: Request, res: Response) => {
  const result = await service.me(req.user!.userId);
  res.json(result);
};
