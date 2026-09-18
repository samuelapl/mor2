import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { AddLessonTimeDto, MarkLessonCompleteDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Get my progress in a course' })
  @ApiParam({ name: 'courseId', type: String })
  async courseProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.progressService.getCourseProgress(user.id, courseId);
  }

  @Get('courses/:courseId/learners')
  @Permissions('progress.view')
  @ApiOperation({ summary: 'Get per-learner progress for a course (staff)' })
  @ApiParam({ name: 'courseId', type: String })
  async courseLearners(@Param('courseId') courseId: string) {
    return this.progressService.getCourseLearnersProgress(courseId);
  }

  @Patch('lessons/:lessonId/complete')
  @Permissions('progress.mark_own')
  @ApiOperation({ summary: 'Mark a lesson complete or update last position' })
  @ApiParam({ name: 'lessonId', type: String })
  async markLessonComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: MarkLessonCompleteDto,
  ) {
    return this.progressService.markLessonComplete(user.id, lessonId, dto);
  }

  @Patch('lessons/:lessonId/time')
  @Permissions('progress.mark_own')
  @ApiOperation({ summary: 'Accumulate time spent on a lesson (heartbeat)' })
  @ApiParam({ name: 'lessonId', type: String })
  async addLessonTime(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: AddLessonTimeDto,
  ) {
    return this.progressService.addLessonTime(user.id, lessonId, dto.secondsDelta);
  }

  @Get('lessons/:lessonId')
  @ApiOperation({ summary: 'Get my progress on a single lesson' })
  @ApiParam({ name: 'lessonId', type: String })
  async lessonProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
  ) {
    return this.progressService.getLessonProgress(user.id, lessonId);
  }

  @Delete('courses/:courseId/reset')
  @ApiOperation({ summary: 'Reset my progress in a course' })
  @ApiParam({ name: 'courseId', type: String })
  async reset(@CurrentUser() user: AuthenticatedUser, @Param('courseId') courseId: string) {
    return this.progressService.resetCourseProgress(user.id, courseId);
  }
}
