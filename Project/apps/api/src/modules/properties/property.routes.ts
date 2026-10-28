import { Router } from 'express';
import { z } from 'zod';
import {
  imageMetaSchema, listingStatusChangeSchema, objectId, propertyDraftSchema, propertySearchSchema, propertyUpdateSchema, reportListingSchema,
} from '@skyspace/shared';
import { guard, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { imageUpload } from '../../middleware/upload';
import { enquiryLimiter, uploadLimiter } from '../../middleware/rateLimit';
import * as c from './property.controller';

const idParams = z.object({ id: objectId });

export const propertyRouter = Router();
propertyRouter.get('/', validate({ query: propertySearchSchema }), c.search);
propertyRouter.post('/', ...guard('property:create'), validate({ body: propertyDraftSchema }), c.create);
propertyRouter.get('/:id/similar', validate({ params: idParams }), c.similar);
propertyRouter.get('/:slug', optionalAuth, c.getBySlug);
propertyRouter.patch('/:id', ...guard('property:edit_own'), validate({ params: idParams, body: propertyUpdateSchema }), c.update);
propertyRouter.delete('/:id', ...guard('property:edit_own'), validate({ params: idParams }), c.remove);
propertyRouter.post('/:id/submit', ...guard('property:edit_own'), validate({ params: idParams }), c.submit);
propertyRouter.post('/:id/status', ...guard('property:edit_own'), validate({ params: idParams, body: listingStatusChangeSchema }), c.changeStatus);
propertyRouter.post('/:id/images', uploadLimiter, ...guard('property:edit_own'), validate({ params: idParams }), imageUpload.array('images', 10), c.addImages);
propertyRouter.patch(
  '/:id/images',
  ...guard('property:edit_own'),
  validate({ params: idParams, body: z.object({ images: z.array(imageMetaSchema.extend({ id: objectId })).max(20) }) }),
  c.updateImages,
);
propertyRouter.delete('/:id/images/:imageId', ...guard('property:edit_own'), validate({ params: idParams.extend({ imageId: objectId }) }), c.removeImage);
propertyRouter.post('/:id/report', enquiryLimiter, optionalAuth, validate({ params: idParams, body: reportListingSchema }), c.report);

/** Owner / agent listing management. */
export const ownerRouter = Router();
ownerRouter.get('/properties', ...guard('property:view_own'), c.listMine);
ownerRouter.get('/properties/:id', ...guard('property:view_own'), validate({ params: idParams }), c.getManaged);
