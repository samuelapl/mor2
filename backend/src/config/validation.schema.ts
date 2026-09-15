import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  PORT: number;

  @IsEnum(Environment)
  @IsOptional()
  APP_ENV: Environment;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  MINIO_ENDPOINT: string;

  @IsNumber()
  @IsOptional()
  MINIO_PORT: number;

  @IsString()
  @IsOptional()
  MINIO_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  MINIO_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  MINIO_BUCKET: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string;

  @IsString()
  @IsOptional()
  SMTP_HOST: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT: number;

  @IsString()
  @IsOptional()
  SMTP_USER: string;

  @IsString()
  @IsOptional()
  SMTP_PASS: string;

  @IsString()
  @IsOptional()
  SMTP_FROM: string;

  @IsString()
  @IsOptional()
  SMTP_SECURE: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
