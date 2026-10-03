import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { RolesGuard } from '@common/guards';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SessionPlansService } from './session-plans.service';
import { CoursesService } from '@modules/courses/courses.service';
import { AddSessionQuizDto, RemoveSessionPlanDto, ReplaceSessionPlansDto } from './dto';

@ApiTags('session-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SessionPlansController {
  constructor(
    private readonly sessionPlansService: SessionPlansService,
    private readonly coursesService: CoursesService,
  ) {}

  @Get('courses/:courseId/session-plans')
  @ApiOperation({
    summary: 'List the planned online sessions of a course, with their weighted quizzes',
  })
  @ApiParam({ name: 'courseId', type: String })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.sessionPlansService.findByCourse(courseId);
  }

  @Put('courses/:courseId/session-plans')
  @Permissions('course.manage_curriculum', 'course.create')
  @ApiOperation({
    summary: 'Replace all planned online sessions of a course (DRAFT / REJECTED only)',
  })
  @ApiParam({ name: 'courseId', type: String })
  async replaceAll(
    @Param('courseId') courseId: string,
    @Body() dto: ReplaceSessionPlansDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.coursesService.assertCanEditDraft(courseId, user, ['course.manage_curriculum']);
    return this.sessionPlansService.replaceAll(courseId, dto);
  }

  @Delete('courses/:courseId/session-plans/:planId')
  @Permissions('live_session.manage_all', 'course.manage_curriculum')
  @ApiOperation({
    summary: 'Remove a planned session; after approval its quiz weight must be rebalanced',
  })
  async removePlan(
    @Param('courseId') courseId: string,
    @Param('planId') planId: string,
    @Body() dto: RemoveSessionPlanDto,
  ) {
    return this.sessionPlansService.removePlan(courseId, planId, dto);
  }

  @Post('courses/:courseId/session-plans/:planId/quizzes')
  @Permissions('live_session.manage_all', 'live_session.manage_own')
  @ApiOperation({
    summary:
      'Add a weighted quiz to a planned session of an approved course (total must stay 100%)',
  })
  async addQuiz(
    @Param('courseId') courseId: string,
    @Param('planId') planId: string,
    @Body() dto: AddSessionQuizDto,
  ) {
    return this.sessionPlansService.addQuiz(courseId, planId, dto);
  }
}
