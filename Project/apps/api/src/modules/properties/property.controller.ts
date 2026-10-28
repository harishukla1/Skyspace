import type { Request, Response } from 'express';
import type { PropertySearch } from '@skyspace/shared';
import { pageParams, param, queryStr } from '../../utils/http';
import * as svc from './property.service';

export async function search(req: Request, res: Response) {
  res.json(await svc.search(req.valid.query as PropertySearch));
}
export async function getBySlug(req: Request, res: Response) {
  res.set('Cache-Control', req.user ? 'private, no-store' : 'public, max-age=60');
  res.json({ property: await svc.getPublicBySlug(param(req, 'slug'), req.user) });
}
export async function similar(req: Request, res: Response) {
  res.json({ items: await svc.similar(param(req, 'id')) });
}
export async function create(req: Request, res: Response) {
  res.status(201).json({ property: await svc.create(req.user!, req.body) });
}
export async function update(req: Request, res: Response) {
  res.json(await svc.update(req.user!, param(req, 'id'), req.body));
}
export async function remove(req: Request, res: Response) {
  res.json({ property: await svc.archive(req.user!, param(req, 'id')) });
}
export async function submit(req: Request, res: Response) {
  res.json({ property: await svc.submit(req.user!, param(req, 'id')) });
}
export async function changeStatus(req: Request, res: Response) {
  res.json({ property: await svc.changeStatusByOwner(req.user!, param(req, 'id'), req.body.status, req.body.comment) });
}
export async function addImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[]) ?? [];
  res.status(201).json({ images: await svc.addImages(req.user!, param(req, 'id'), files, req.body?.altText) });
}
export async function updateImages(req: Request, res: Response) {
  res.json({ images: await svc.updateImages(req.user!, param(req, 'id'), req.body.images) });
}
export async function removeImage(req: Request, res: Response) {
  res.json({ images: await svc.removeImage(req.user!, param(req, 'id'), param(req, 'imageId')) });
}
export async function report(req: Request, res: Response) {
  res.status(201).json(await svc.report(req, param(req, 'id'), req.body));
}
export async function listMine(req: Request, res: Response) {
  const { page, limit } = pageParams(req);
  res.json(await svc.listMine(req.user!, { status: queryStr(req, 'status'), page, limit }));
}
export async function getManaged(req: Request, res: Response) {
  res.json(await svc.getManaged(req.user!, param(req, 'id')));
}
