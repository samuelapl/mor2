import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { CourseStateMachine } from './statemachine/course-state-machine';
import { PrismaService } from '@config/prisma.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ProgressModule } from '@modules/progress/progress.module';

@Module({
  imports: [NotificationsModule, ProgressModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseStateMachine, PrismaService],
  exports: [CoursesService],
})
export class CoursesModule {}
