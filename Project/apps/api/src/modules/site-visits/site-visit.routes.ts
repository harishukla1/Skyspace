import { Router, type Request } from 'express';
import { z } from 'zod';
import { objectId, siteVisitCreateSchema, siteVisitRescheduleSchema, siteVisitStatusSchema } from '@skyspace/shared';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { enquiryLimiter } from '../../middleware/rateLimit';
import { pageParams, param, queryStr } from '../../utils/http';
import * as svc from './site-visit.service';

const idParams = z.object({ id: objectId });
export const visitListOpts = (req: Request) => ({ ...pageParams(req), status: queryStr(req, 'status'), upcoming: queryStr(req, 'upcoming') === 'true' });

export const siteVisitRouter = Router();
siteVisitRouter.post('/', enquiryLimiter, optionalAuth, validate({ body: siteVisitCreateSchema }), async (req, res) => {
  res.status(201).json({ visit: await svc.create(req, req.body) });
});
siteVisitRouter.patch('/:id/status', requireAuth, validate({ params: idParams, body: siteVisitStatusSchema }), async (req, res) => {
  res.json({ visit: await svc.updateStatus(req, param(req, 'id'), req.body.status, req.body.note) });
});
siteVisitRouter.patch('/:id/reschedule', requireAuth, validate({ params: idParams, body: siteVisitRescheduleSchema }), async (req, res) => {
  res.json({ visit: await svc.reschedule(req, param(req, 'id'), req.body) });
});
