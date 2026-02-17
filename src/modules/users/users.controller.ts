import { Request, Response } from 'express';
import * as service from './users.service';

export const listUsers = async (req: Request, res: Response) => {
  const result = await service.listUsers(req.query.q as string | undefined);
  res.json(result);
};

export const updateRole = async (req: Request, res: Response) => {
  const result = await service.updateUserRole(req.params.id, req.body.role);
  res.json(result);
};

export const createUser = async (req: Request, res: Response) => {
  const result = await service.createUser(req.body);
  res.status(201).json(result);
};
