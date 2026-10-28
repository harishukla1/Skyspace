import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { zodDetails } from './validate';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: zodDetails(err) } });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message } });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid ${err.path}` } });
  }
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with these details already exists' } });
  }
  const e = err as { type?: string; status?: number };
  if (e?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large' } });
  if (e?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
}
