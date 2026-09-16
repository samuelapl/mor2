import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './config/prisma.service';
import { validate } from './config/validation.schema';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { ProgressModule } from './modules/progress/progress.module';
import { LiveSessionsModule } from './modules/live-sessions/live-sessions.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { FilesModule } from './modules/files/files.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards';
import { PermissionsGuard } from './modules/permissions/guards/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    CurriculumModule,
    AttachmentsModule,
    AssessmentsModule,
    EnrollmentsModule,
    ProgressModule,
    LiveSessionsModule,
    AttendanceModule,
    CertificatesModule,
    NotificationsModule,
    AuditModule,
    AdminModule,
    FilesModule,
    IntegrationsModule,
    HealthModule,
    MailModule,
    PermissionsModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
