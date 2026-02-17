import { Request, Response } from 'express';
import * as service from './documents.service';

const actor = (req: Request) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  department: req.user!.department
});

export const createDraft = async (req: Request, res: Response) => {
  const result = await service.createDraft(req.body, actor(req));
  res.status(201).json(result);
};

export const listMyDocuments = async (req: Request, res: Response) => {
  const result = await service.listMyDocuments(req.user!.userId);
  res.json(result);
};

export const listAllDocuments = async (req: Request, res: Response) => {
  const result = await service.listAllDocuments(req.query as any);
  res.json(result);
};

export const getDocumentById = async (req: Request, res: Response) => {
  const result = await service.getDocumentById(req.params.id, actor(req));
  res.json(result);
};

export const updateDocument = async (req: Request, res: Response) => {
  const result = await service.updateDocument(req.params.id, actor(req), req.body);
  res.json(result);
};

export const submitDocument = async (req: Request, res: Response) => {
  const result = await service.submitDocument(req.params.id, actor(req));
  res.json(result);
};

export const timeline = async (req: Request, res: Response) => {
  const result = await service.timeline(req.params.id, actor(req));
  res.json(result);
};

export const archiveDocument = async (req: Request, res: Response) => {
  const result = await service.archiveDocument(req.params.id, req.user!.userId);
  res.json(result);
};
