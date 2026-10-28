import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { enquiryAssignSchema, enquiryCreateSchema, enquiryNoteSchema, enquiryStatusSchema, objectId } from '@skyspace/shared';
import { guard, optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { enquiryLimiter } from '../../middleware/rateLimit';
import { verifyCaptcha } from '../../services/captcha';
import { forbidden } from '../../utils/errors';
import { pageParams, param, queryStr } from '../../utils/http';
import * as svc from './enquiry.service';

const idParams = z.object({ id: objectId });
export const listOpts = (req: Request) => {
  const { page, limit } = pageParams(req);
  const d = (k: string) => {
    const v = queryStr(req, k);
    const dt = v ? new Date(v) : undefined;
    return dt && !isNaN(dt.getTime()) ? dt : undefined;
  };
  return { page, limit, status: queryStr(req, 'status'), q: queryStr(req, 'q')?.slice(0, 80), propertyId: queryStr(req, 'propertyId'), agentId: queryStr(req, 'agentId'), from: d('from'), to: d('to') };
};

export const enquiryRouter = Router();
enquiryRouter.post('/', enquiryLimiter, optionalAuth, validate({ body: enquiryCreateSchema }), async (req: Request, res: Response) => {
  if (!(await verifyCaptcha(req.get('x-captcha-token'), req.ip))) throw forbidden('Anti-bot check failed');
  res.status(201).json(await svc.create(req, req.body));
});
enquiryRouter.get('/:id', requireAuth, validate({ params: idParams }), async (req, res) => {
  res.json({ enquiry: await svc.get(req.user!, param(req, 'id')) });
});
enquiryRouter.patch('/:id/status', requireAuth, validate({ params: idParams, body: enquiryStatusSchema }), async (req, res) => {
  res.json({ enquiry: await svc.updateStatus(req, param(req, 'id'), req.body) });
});
enquiryRouter.post('/:id/notes', requireAuth, validate({ params: idParams, body: enquiryNoteSchema }), async (req, res) => {
  res.json({ enquiry: await svc.addNote(req, param(req, 'id'), req.body) });
});
enquiryRouter.patch('/:id/assignment', ...guard('admin:leads_manage'), validate({ params: idParams, body: enquiryAssignSchema }), async (req, res) => {
  res.json({ enquiry: await svc.assign(req, param(req, 'id'), req.body.agentId) });
});
