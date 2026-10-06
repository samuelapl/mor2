import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { FilesService, FilePurpose } from './files.service';
import { CoursesService } from '@modules/courses/courses.service';
import { ScormService } from '@modules/courses/scorm.service';
import { CurrentUser, Permissions, Roles } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => CoursesService))
    private readonly coursesService: CoursesService,
    private readonly scormService: ScormService,
  ) {}

  @Post('upload')
  @Roles(
    RoleName.COURSE_OWNER,
    RoleName.TRAINER,
    RoleName.TRAINING_ADMIN,
    RoleName.SYSTEM_ADMIN,
    RoleName.LEARNER,
    RoleName.CONTENT_APPROVER,
  )
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (attachment/SCORM/document/video)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: { type: 'string', enum: ['attachment', 'scorm', 'certificate'] },
        moduleId: { type: 'string' },
        lessonId: { type: 'string' },
        courseId: { type: 'string' },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { purpose: FilePurpose; moduleId?: string; lessonId?: string; courseId?: string },
  ) {
    return this.filesService.upload(file, body.purpose || 'attachment', {
      moduleId: body.moduleId,
      lessonId: body.lessonId,
      courseId: body.courseId,
    });
  }

  @Post('scorm/preview')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a SCORM ZIP, store it, and return a parsed preview (course details + curriculum) matching the manual creation flow',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'SCORM package (.zip)' },
      },
      required: ['file'],
    },
  })
  async previewScorm(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('SCORM package file is required');
    }

    // 1. Store the ZIP in MinIO (purpose: scorm → scorm/ path, application/zip validation)
    const record = await this.filesService.upload(file, 'scorm');

    // 2. Parse the manifest and build a preview matching CreateCourseBody + ReplaceModulesDto
    return this.scormService.buildPreview(file.buffer, {
      url: record.fileUrl,
      key: record.fileKey,
      name: record.fileName,
      size: record.sizeBytes,
    });
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a profile avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.filesService.uploadAvatar(file, user.id);
  }

  @Post('cover/:courseId')
  @Permissions('course.update.own', 'course.update.all', 'course.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a course cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiParam({ name: 'courseId', type: String })
  async uploadCover(
    @UploadedFile() file: Express.Multer.File,
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.coursesService.assertCanEditDraft(courseId, user, [
      'course.update.own',
      'course.update.all',
    ]);
    return this.filesService.uploadCover(file, courseId);
  }

  @Post('certificate-template')
  @Permissions('CERTIFICATE_TEMPLATE_MANAGE')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a certificate template background image (PNG/JPG)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadCertificateTemplate(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadCertificateTemplate(file);
  }

  @Delete(':key')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Delete a file by object key' })
  @ApiParam({ name: 'key', type: String })
  async remove(@Param('key') key: string) {
    return this.filesService.remove(key);
  }
}
