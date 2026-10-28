import type { Request } from 'express';
import { PAGE_SIZE_MAX, type Paginated } from '@skyspace/shared';
import { badRequest } from './errors';
import { Types } from 'mongoose';

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function pageParams(req: Request) {
  const page = Math.min(Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1), 1000);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), PAGE_SIZE_MAX);
  return { page, limit, skip: (page - 1) * limit };
}

export function oid(id: string | undefined, what = 'id') {
  if (!id || !Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id.toLowerCase()) throw badRequest(`Invalid ${what}`);
  return new Types.ObjectId(id);
}

export const param = (req: Request, name: string) => String(req.params[name] ?? '');
export const queryStr = (req: Request, name: string) => (typeof req.query[name] === 'string' ? (req.query[name] as string).trim() : undefined);
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const clientIp = (req: Request) => req.ip ?? 'unknown';
export const toIso = (d?: Date | null) => (d ? d.toISOString() : undefined);
