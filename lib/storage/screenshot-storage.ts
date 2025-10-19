import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'analysis-screenshots';
const bucketName = process.env.SUPABASE_SCREENSHOT_BUCKET || DEFAULT_BUCKET;

let bucketInitPromise: Promise<void> | null = null;

export interface UploadScreenshotParams {
  client: SupabaseClient;
  buffer: Buffer;
  userId: string;
  analysisId: string;
  variant: 'mobile-full-page';
  contentType?: string;
}

export async function uploadScreenshot({
  client,
  buffer,
  userId,
  analysisId,
  variant,
  contentType = 'image/jpeg',
}: UploadScreenshotParams): Promise<string> {
  await ensureBucketExists(client);

  const path = `${userId}/${analysisId}/${variant}-${randomUUID()}.jpg`;

  const { error } = await client.storage.from(bucketName).upload(path, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload screenshot (${variant}): ${error.message}`);
  }

  const { data } = client.storage.from(bucketName).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(`Failed to resolve public URL for screenshot (${variant})`);
  }

  return data.publicUrl;
}

async function ensureBucketExists(client: SupabaseClient): Promise<void> {
  if (!bucketInitPromise) {
    bucketInitPromise = (async () => {
      const { data, error } = await client.storage.getBucket(bucketName);
      if (data && !error) {
        return;
      }

      const { error: createError } = await client.storage.createBucket(bucketName, {
        public: true,
      });

      if (createError && !bucketAlreadyExists(createError)) {
        throw new Error(`Failed to create storage bucket "${bucketName}": ${createError.message}`);
      }
    })().catch((err) => {
      bucketInitPromise = null;
      throw err;
    });
  }

  return bucketInitPromise;
}

function bucketAlreadyExists(error: { message: string }): boolean {
  return /bucket (already exists|exists)/i.test(error.message);
}
