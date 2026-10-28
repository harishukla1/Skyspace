import multer from 'multer';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@skyspace/shared';
import { badRequest } from '../utils/errors';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) return cb(badRequest('Only JPEG, PNG or WebP images are allowed'));
    cb(null, true);
  },
});

/** Verify file signatures — the client-declared MIME type is not trusted. */
export function sniffImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}
