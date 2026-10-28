import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

export interface StoredObject {
  key: string;
  url: string;
}
interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}

export const localUploadRoot = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);

/** Development driver: writes to disk and serves files from the API at /uploads. */
const localDriver: StorageDriver = {
  async put(key, body) {
    const file = path.join(localUploadRoot, key);
    if (!file.startsWith(localUploadRoot)) throw new Error('Invalid storage key');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return { key, url: `${env.API_PUBLIC_URL}/uploads/${key}` };
  },
  async remove(key) {
    const file = path.join(localUploadRoot, key);
    if (!file.startsWith(localUploadRoot)) return;
    await fs.rm(file, { force: true });
  },
};

/** Any S3-compatible service: AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO, Backblaze B2. */
function s3Driver(): StorageDriver {
  const client = new S3Client({
    region: env.OBJECT_STORAGE_REGION,
    endpoint: env.OBJECT_STORAGE_ENDPOINT || undefined,
    forcePathStyle: !!env.OBJECT_STORAGE_ENDPOINT,
    credentials: { accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY!, secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY! },
  });
  const bucket = env.OBJECT_STORAGE_BUCKET!;
  const publicBase = env.OBJECT_STORAGE_PUBLIC_URL ?? `https://${bucket}.s3.${env.OBJECT_STORAGE_REGION}.amazonaws.com`;
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
      );
      return { key, url: `${publicBase.replace(/\/$/, '')}/${key}` };
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export const storage: StorageDriver = env.STORAGE_DRIVER === 's3' ? s3Driver() : localDriver;
