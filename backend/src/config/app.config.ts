const isProduction =
  (process.env.NODE_ENV || '').toLowerCase() === 'production' ||
  (process.env.APP_ENV || '').toLowerCase() === 'production';

function getRequiredSecret(key: string, devFallback: string): string {
  const val = process.env[key];
  if (isProduction && (!val || val === devFallback)) {
    throw new Error(
      `FATAL CONFIG ERROR: Environment variable "${key}" is required in production and cannot use default/development credentials.`,
    );
  }
  return val || devFallback;
}

export const AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'MoR Tele ELTMS',
  appEnv: process.env.APP_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
} as const;

export const JwtConfig = {
  accessSecret: getRequiredSecret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  refreshSecret: getRequiredSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
} as const;

export const RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
} as const;

export const MinioConfig = {
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  accessKey: getRequiredSecret('MINIO_ACCESS_KEY', 'minioadmin'),
  secretKey: getRequiredSecret('MINIO_SECRET_KEY', 'minioadmin'),
  bucket: process.env.MINIO_BUCKET || 'eltms-files',
  useSSL: process.env.MINIO_USE_SSL === 'true',
} as const;

export const DatabaseConfig = {
  url: process.env.DATABASE_URL,
} as const;

export const LiveKitConfig = {
  url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
  apiKey: getRequiredSecret('LIVEKIT_API_KEY', 'devkey'),
  apiSecret: getRequiredSecret('LIVEKIT_API_SECRET', 'secret'),
} as const;
