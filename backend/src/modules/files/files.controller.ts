import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { CurrentUser, Permissions, Roles } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
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
  @Permissions('course.update.own', 'course.update.all')
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
  ) {
    return this.filesService.uploadCover(file, courseId);
  }

  @Post('certificate-template')
  @Permissions('certificate.manage')
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
