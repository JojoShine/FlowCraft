export function testEnvironment(env: NodeJS.ProcessEnv) {
  const url = env.TEST_DATABASE_URL || 'postgresql://flowcraft_test:local-test-only@127.0.0.1:55439/flowcraft_test';
  const parsed = new URL(url);
  if (!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname) || !parsed.pathname.endsWith('_test')) throw new Error('Tests require a loopback *_test database');
  const endpoint = env.TEST_MINIO_ENDPOINT || '127.0.0.1';
  const bucket = env.TEST_MINIO_BUCKET || 'flowcraft-test-content';
  if (!['127.0.0.1','localhost','::1'].includes(endpoint) || !bucket.startsWith('flowcraft-test-')) throw new Error('Tests require isolated loopback MinIO');
  return {DATABASE_URL:url,MINIO_ENDPOINT:endpoint,MINIO_PORT:env.TEST_MINIO_PORT || '19000',MINIO_USE_SSL:'false',MINIO_BUCKET:bucket,MINIO_ACCESS_KEY:env.TEST_MINIO_ACCESS_KEY || 'flowcraft-test',MINIO_SECRET_KEY:env.TEST_MINIO_SECRET_KEY || 'local-test-only-secret',JWT_SECRET:'content-test-only-secret'};
}
