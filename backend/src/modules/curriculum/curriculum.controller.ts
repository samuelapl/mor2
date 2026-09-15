import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurriculumService } from './curriculum.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  ReplaceModulesDto,
} from './dto';
import { Roles } from '@common/decorators';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('curriculum')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  // ── Modules ────────────────────────────────────────
  @Get('courses/:courseId/modules')
  @ApiOperation({ summary: 'List modules for a course' })
  @ApiParam({ name: 'courseId', type: String })
  async getModules(@Param('courseId') courseId: string) {
    return this.curriculumService.getModules(courseId);
  }

  @Put('courses/:courseId/curriculum')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Replace the full curriculum (modules + lessons) for a course' })
  @ApiParam({ name: 'courseId', type: String })
  async replaceAll(@Param('courseId') courseId: string, @Body() dto: ReplaceModulesDto) {
    return this.curriculumService.replaceAll(courseId, dto);
  }

  @Post('courses/:courseId/modules')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Create a module in a course' })
  @ApiParam({ name: 'courseId', type: String })
  async createModule(@Param('courseId') courseId: string, @Body() dto: CreateModuleDto) {
    return this.curriculumService.createModule(courseId, dto);
  }

  @Get('modules/:moduleId')
  @ApiOperation({ summary: 'Get module details with lessons' })
  @ApiParam({ name: 'moduleId', type: String })
  async getModule(@Param('moduleId') moduleId: string) {
    return this.curriculumService.getModule(moduleId);
  }

  @Patch('modules/:moduleId')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'moduleId', type: String })
  async updateModule(@Param('moduleId') moduleId: string, @Body() dto: UpdateModuleDto) {
    return this.curriculumService.updateModule(moduleId, dto);
  }

  @Patch('courses/:courseId/modules/reorder')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Reorder modules in a course' })
  @ApiParam({ name: 'courseId', type: String })
  async reorderModules(
    @Param('courseId') courseId: string,
    @Body('moduleIds') moduleIds: string[],
  ) {
    return this.curriculumService.reorderModules(courseId, moduleIds);
  }

  @Delete('modules/:moduleId')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Soft delete a module' })
  @ApiParam({ name: 'moduleId', type: String })
  async deleteModule(@Param('moduleId') moduleId: string) {
    return this.curriculumService.deleteModule(moduleId);
  }

  @Post('modules/:moduleId/restore')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.TRAINING_ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted module' })
  @ApiParam({ name: 'moduleId', type: String })
  async restoreModule(@Param('moduleId') moduleId: string) {
    return this.curriculumService.restoreModule(moduleId);
  }

  @Delete('modules/:moduleId/permanent')
  @Roles(RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Permanently delete a module (system admin, cascades lessons)' })
  @ApiParam({ name: 'moduleId', type: String })
  async hardDeleteModule(@Param('moduleId') moduleId: string) {
    return this.curriculumService.hardDeleteModule(moduleId);
  }

  // ── Lessons ────────────────────────────────────────
  @Get('lessons/:lessonId')
  @ApiOperation({ summary: 'Get lesson details' })
  @ApiParam({ name: 'lessonId', type: String })
  async getLesson(@Param('lessonId') lessonId: string) {
    return this.curriculumService.getLesson(lessonId);
  }

  @Post('modules/:moduleId/lessons')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Create a lesson in a module' })
  @ApiParam({ name: 'moduleId', type: String })
  async createLesson(@Param('moduleId') moduleId: string, @Body() dto: CreateLessonDto) {
    return this.curriculumService.createLesson(moduleId, dto);
  }

  @Patch('lessons/:lessonId')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiParam({ name: 'lessonId', type: String })
  async updateLesson(@Param('lessonId') lessonId: string, @Body() dto: UpdateLessonDto) {
    return this.curriculumService.updateLesson(lessonId, dto);
  }

  @Patch('modules/:moduleId/lessons/reorder')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Reorder lessons in a module' })
  @ApiParam({ name: 'moduleId', type: String })
  async reorderLessons(
    @Param('moduleId') moduleId: string,
    @Body('lessonIds') lessonIds: string[],
  ) {
    return this.curriculumService.reorderLessons(moduleId, lessonIds);
  }

  @Delete('lessons/:lessonId')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Soft delete a lesson' })
  @ApiParam({ name: 'lessonId', type: String })
  async deleteLesson(@Param('lessonId') lessonId: string) {
    return this.curriculumService.deleteLesson(lessonId);
  }

  @Post('lessons/:lessonId/restore')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.TRAINING_ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted lesson' })
  @ApiParam({ name: 'lessonId', type: String })
  async restoreLesson(@Param('lessonId') lessonId: string) {
    return this.curriculumService.restoreLesson(lessonId);
  }

  @Delete('lessons/:lessonId/permanent')
  @Roles(RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Permanently delete a lesson (system admin)' })
  @ApiParam({ name: 'lessonId', type: String })
  async hardDeleteLesson(@Param('lessonId') lessonId: string) {
    return this.curriculumService.hardDeleteLesson(lessonId);
  }
}
