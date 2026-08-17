import * as Minio from 'minio';
import { Readable } from 'stream';

let _client: Minio.Client | null = null;
let _bucketName: string | null = null;

function getClient(): Minio.Client {
  if (!_client) {
    _client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
    });
  }
  return _client;
}

function getBucketName(): string {
  if (!_bucketName) {
    _bucketName = process.env.MINIO_BUCKET || 'flowcraft';
  }
  return _bucketName;
}

let bucketInitialized = false;

async function ensureBucket() {
  if (bucketInitialized) return;
  const client = getClient();
  const bucket = getBucketName();

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
    console.log(`[MinIO] Created bucket: ${bucket}`);
  }
  bucketInitialized = true;
}

export async function uploadFile(
  buffer: Buffer,
  objectName: string,
  mimeType: string
): Promise<string> {
  await ensureBucket();
  await getClient().putObject(getBucketName(), objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
  return objectName;
}

export async function getFileStream(
  objectName: string
): Promise<{ stream: Readable; contentType: string }> {
  await ensureBucket();
  const client = getClient();
  const bucket = getBucketName();

  const stream = await client.getObject(bucket, objectName);
  const stat = await client.statObject(bucket, objectName);

  return {
    stream,
    contentType: stat.metaData['content-type'] || 'application/octet-stream',
  };
}

export async function deleteFile(objectName: string): Promise<void> {
  await ensureBucket();
  await getClient().removeObject(getBucketName(), objectName);
}

export { getClient as minioClient, getBucketName as BUCKET_NAME };
