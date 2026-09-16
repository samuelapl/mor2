import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { EnrollmentsService } from './enrollments.service';
import { BulkEnrollDto, CreateEnrollmentDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('enrollments/self')
  @Permissions('enrollment.self')
  @ApiOperation({ summary: 'Self-enroll into a published course' })
  async selfEnroll(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.selfEnroll(user.id, dto);
  }

  @Get('enrollments/me')
  @Permissions('enrollment.self')
  @ApiOperation({ summary: 'List my enrollments' })
  async myEnrollments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.enrollmentsService.findByUser(user.id, query);
  }

  @Get('enrollments')
  @Permissions('enrollment.view_all')
  @ApiOperation({ summary: 'List all enrollments (admin)' })
  async findAll(@Query() query: PaginationQuery & { status?: EnrollmentStatus }) {
    return this.enrollmentsService.findAll(query);
  }

  @Get('users/:userId/enrollments')
  @Permissions('enrollment.view_all')
  @ApiOperation({ summary: 'List enrollments for a specific user' })
  @ApiParam({ name: 'userId', type: String })
  async byUser(@Param('userId') userId: string, @Query() query: PaginationQuery) {
    return this.enrollmentsService.findByUser(userId, query);
  }

  @Get('courses/:courseId/enrollments')
  @Permissions('student.view', 'course.view_enrollments')
  @ApiOperation({ summary: 'List enrollments for a course (staff)' })
  @ApiParam({ name: 'courseId', type: String })
  async byCourse(@Param('courseId') courseId: string, @Query() query: PaginationQuery) {
    return this.enrollmentsService.findByCourse(courseId, query);
  }

  @Post('courses/:courseId/enrollments')
  @Permissions('student.manage')
  @ApiOperation({ summary: 'Bulk enroll learners into a course (admin)' })
  @ApiParam({ name: 'courseId', type: String })
  async bulkEnroll(@Param('courseId') courseId: string, @Body() dto: BulkEnrollDto) {
    return this.enrollmentsService.bulkEnroll(courseId, dto.userIds);
  }

  @Patch('enrollments/:id/drop')
  @Permissions('enrollment.self')
  @ApiOperation({ summary: 'Drop an enrollment (self-drop)' })
  @ApiParam({ name: 'id', type: String })
  async drop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.enrollmentsService.drop(user.id, id, reason);
  }
}
