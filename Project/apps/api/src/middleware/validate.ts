import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const zodDetails = (e: ZodError) => e.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

export const validate =
  (schemas: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.valid ??= {};
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) req.valid.query = schemas.query.parse(req.query);
      if (schemas.params) req.valid.params = schemas.params.parse(req.params);
      next();
    } catch (e) {
      if (e instanceof ZodError) return next(new AppError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields', zodDetails(e)));
      next(e);
    }
  };
