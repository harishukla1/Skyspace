import type { Request } from 'express';
import { AuditLog } from '../models/misc.models';
import { logger } from '../utils/logger';

const FORBIDDEN_KEYS = /pass|token|secret|hash|otp/i;

function scrub(meta: Record<string, unknown> | undefined) {
  if (!meta) return undefined;
  return Object.fromEntries(Object.entries(meta).filter(([k]) => !FORBIDDEN_KEYS.test(k)));
}

export async function audit(
  req: Request | undefined,
  action: string,
  entityType: string,
  entityId: string | undefined,
  metadata?: Record<string, unknown>,
) {
  try {
    await AuditLog.create({ actorId: req?.user?.id, action, entityType, entityId, metadata: scrub(metadata), ip: req?.ip });
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log');
  }
}
