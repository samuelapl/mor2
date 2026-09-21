import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { AppValidationPipe } from './common/pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // LiveKit server webhooks use Content-Type: application/webhook+json
  app.use(
    express.raw({
      type: 'application/webhook+json',
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );

  // Trust one reverse-proxy hop so req.ip reflects the real client address
  // (X-Forwarded-For) once this sits behind nginx/a load balancer.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── Security ──────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: AppConfig.frontendUrl,
    credentials: true,
  });

  // ── Global pipes, filters, interceptors ───────────
  app.useGlobalPipes(AppValidationPipe);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── API prefix ────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger ───────────────────────────────────────
  if (AppConfig.appEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(AppConfig.appName)
      .setDescription('MoR Tele E-Learning Training Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & authorization')
      .addTag('users', 'User management')
      .addTag('courses', 'Course lifecycle')
      .addTag('curriculum', 'Modules & lessons')
      .addTag('assessments', 'Quizzes & exams')
      .addTag('enrollments', 'Learner enrollment')
      .addTag('progress', 'Progress tracking')
      .addTag('live-sessions', 'Live session scheduling')
      .addTag('attendance', 'Session attendance')
      .addTag('certificates', 'Certificate issuance')
      .addTag('notifications', 'User notifications')
      .addTag('admin', 'System administration')
      .addTag('audit', 'Audit logs')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  await app.listen(AppConfig.port);
  console.log(`🚀 ${AppConfig.appName} running on http://localhost:${AppConfig.port}`);
  console.log(`📚 Swagger docs at http://localhost:${AppConfig.port}/api/v1/docs`);
}

bootstrap();
