import { AnyZodObject, ZodEffects, ZodTypeAny } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';

export const validate = (schema: AnyZodObject | ZodEffects<AnyZodObject> | ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!parsed.success) {
      next(new AppError('VALIDATION_ERROR', 'Request validation failed', 422, parsed.error.flatten()));
      return;
    }

    req.body = parsed.data.body;
    req.query = parsed.data.query;
    req.params = parsed.data.params;
    next();
  };
};
