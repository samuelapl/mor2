import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { CourseStateMachine } from './statemachine/course-state-machine';
import { ScormService } from './scorm.service';
import { PrismaService } from '@config/prisma.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ProgressModule } from '@modules/progress/progress.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';

@Module({
  imports: [NotificationsModule, ProgressModule, PermissionsModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseStateMachine, ScormService, PrismaService],
  exports: [CoursesService, ScormService],
})
export class CoursesModule {}
