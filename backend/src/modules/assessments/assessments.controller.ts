import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto, SubmitAssessmentDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('courses/:courseId/assessments')
  @ApiOperation({ summary: 'List assessments for a course' })
  @ApiParam({ name: 'courseId', type: String })
  async findByCourse(@Param('courseId') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    const isLearner = user.roles.includes(RoleName.LEARNER);
    return this.assessmentsService.findByCourse(courseId, isLearner);
  }

  @Post('courses/:courseId/assessments')
  @Permissions('quiz.create')
  @ApiOperation({ summary: 'Create an assessment for a course' })
  @ApiParam({ name: 'courseId', type: String })
  async create(@Param('courseId') courseId: string, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(courseId, dto);
  }

  @Put('courses/:courseId/assessment')
  @Permissions('quiz.create')
  @ApiOperation({ summary: 'Replace the course assessment (delete-all + create). Only DRAFT/REJECTED' })
  @ApiParam({ name: 'courseId', type: String })
  async replaceForCourse(@Param('courseId') courseId: string, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.replaceForCourse(courseId, dto);
  }

  @Get('assessments/:id')
  @ApiOperation({ summary: 'Get assessment details (answers stripped for learners)' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({
    name: 'includeAnswers',
    required: false,
    description: 'Staff only: include correct answers',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeAnswers') includeAnswers?: string,
  ) {
    const isLearner = user.roles.includes(RoleName.LEARNER);
    const withAnswers = !isLearner && includeAnswers === 'true';
    return this.assessmentsService.findById(id, withAnswers);
  }

  @Patch('assessments/:id')
  @Permissions('quiz.create')
  @ApiOperation({ summary: 'Update an assessment' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.update(id, dto);
  }

  @Get('assessments/:id/attempts')
  @Permissions('result.view.own', 'result.view.all')
  @ApiOperation({ summary: 'List attempts for an assessment (learners see their own)' })
  @ApiParam({ name: 'id', type: String })
  async attempts(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.getAttempts(id, user);
  }

  @Post('assessments/:id/start')
  @Permissions('assessment.submit')
  @ApiOperation({ summary: 'Start a new assessment attempt' })
  @ApiParam({ name: 'id', type: String })
  async startAttempt(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.startAttempt(id, user);
  }

  @Post('assessments/:id/submit')
  @Permissions('assessment.submit')
  @ApiOperation({ summary: 'Submit answers and get graded result' })
  @ApiParam({ name: 'id', type: String })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitAssessmentDto,
  ) {
    return this.assessmentsService.submit(id, user.id, dto);
  }

  @Get('assessments/:id/grading')
  @Permissions('quiz.grade')
  @ApiOperation({ summary: 'Get grading summary for an assessment (staff)' })
  @ApiParam({ name: 'id', type: String })
  async grading(@Param('id') id: string) {
    return this.assessmentsService.gradingSummary(id);
  }
}
