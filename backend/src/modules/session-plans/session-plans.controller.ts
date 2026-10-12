import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { RolesGuard } from '@common/guards';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SessionPlansService } from './session-plans.service';
import { CoursesService } from '@modules/courses/courses.service';
import {
  AddSessionQuizDto,
  AssignSessionPlanTrainerDto,
  RemoveSessionPlanDto,
  ReplaceSessionPlansDto,
} from './dto';

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
    summary: 'Remove a planned session and its formative quizzes',
  })
  async removePlan(
    @Param('courseId') courseId: string,
    @Param('planId') planId: string,
    // Body accepted for older clients; its `rebalance` is ignored.
    @Body() _dto: RemoveSessionPlanDto,
  ) {
    return this.sessionPlansService.removePlan(courseId, planId);
  }

  @Patch('courses/:courseId/session-plans/:planId/trainer')
  @Permissions('course.assign_trainer')
  @ApiOperation({
    summary: 'Assign (or clear) the trainer of a planned session, before or after scheduling',
  })
  async assignTrainer(
    @Param('courseId') courseId: string,
    @Param('planId') planId: string,
    @Body() dto: AssignSessionPlanTrainerDto,
  ) {
    return this.sessionPlansService.assignTrainer(courseId, planId, dto.trainerId ?? null);
  }

  @Post('courses/:courseId/session-plans/:planId/quizzes')
  @Permissions('live_session.manage_all', 'live_session.manage_own')
  @ApiOperation({
    summary:
      'Add a formative quiz (score only, not graded) to a planned session of an approved course',
  })
  async addQuiz(
    @Param('courseId') courseId: string,
    @Param('planId') planId: string,
    @Body() dto: AddSessionQuizDto,
  ) {
    return this.sessionPlansService.addQuiz(courseId, planId, dto);
  }
}
