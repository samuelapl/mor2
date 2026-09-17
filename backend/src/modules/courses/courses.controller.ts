import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CourseStatus } from '@prisma/client';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, ReviewCourseDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @Permissions('course.browse', 'course.view.own', 'course.view.all', 'course.view.assigned')
  @ApiOperation({ summary: 'List courses (all authenticated users)' })
  async findAll(
    @Query() query: PaginationQuery & { status?: CourseStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.findAll(query, user);
  }

  @Get(':id')
  @Permissions('course.browse', 'course.view.own', 'course.view.all', 'course.view.assigned')
  @ApiOperation({ summary: 'Get course details by ID (learner-aware: unlock flags + enrollment)' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.findByIdForUser(id, user);
  }

  @Post()
  @Permissions('course.create')
  @ApiOperation({ summary: 'Create a new course (draft)' })
  async create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('course.update.own', 'course.update.all')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.update(id, dto, user);
  }

  @Post(':id/request-approval')
  @Permissions('course.submit_approval')
  @ApiOperation({ summary: 'Submit course for content approval' })
  @ApiParam({ name: 'id', type: String })
  async requestApproval(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.requestApproval(id, user);
  }

  @Post(':id/review')
  @Permissions('course.approve', 'course.reject')
  @ApiOperation({ summary: 'Approve or reject a course after review' })
  @ApiParam({ name: 'id', type: String })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.review(id, dto, user.id);
  }

  @Post(':id/publish')
  @Permissions('course.publish')
  @ApiOperation({ summary: 'Publish an approved course (version++ per BR-09)' })
  @ApiParam({ name: 'id', type: String })
  async publish(@Param('id') id: string) {
    return this.coursesService.publish(id);
  }

  @Post(':id/unpublish')
  @Permissions('course.unpublish')
  @ApiOperation({
    summary: 'Unpublish a published course (returns to approved, no longer visible to learners)',
  })
  @ApiParam({ name: 'id', type: String })
  async unpublish(@Param('id') id: string) {
    return this.coursesService.unpublish(id);
  }

  @Post(':id/archive')
  @Permissions('course.archive')
  @ApiOperation({ summary: 'Archive a course (Course Owner: DRAFT only)' })
  @ApiParam({ name: 'id', type: String })
  async archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.archive(id, user);
  }

  @Delete(':id')
  @Permissions('course.delete')
  @ApiOperation({ summary: 'Soft delete a course (Course Owner: DRAFT only)' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.softDelete(id, user);
  }

  @Post(':id/trainers')
  @Permissions('course.assign_trainer')
  @ApiOperation({ summary: 'Assign a trainer to a course' })
  @ApiParam({ name: 'id', type: String })
  async assignTrainer(@Param('id') id: string, @Body('userId') userId: string) {
    return this.coursesService.assignTrainer(id, userId);
  }

  @Delete(':id/trainers/:userId')
  @Permissions('course.assign_trainer')
  @ApiOperation({ summary: 'Remove a trainer from a course' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'userId', type: String })
  async removeTrainer(@Param('id') id: string, @Param('userId') userId: string) {
    return this.coursesService.removeTrainer(id, userId);
  }
}
