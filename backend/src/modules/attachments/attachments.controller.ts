import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto';
import { CurrentUser, Roles } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('attachments')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Record a file attachment on a module or lesson' })
  async create(@Body() dto: CreateAttachmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.create(dto, user.id);
  }

  @Get('modules/:moduleId/attachments')
  @ApiOperation({ summary: 'List attachments for a module' })
  @ApiParam({ name: 'moduleId', type: String })
  async findByModule(@Param('moduleId') moduleId: string) {
    return this.attachmentsService.findByModule(moduleId);
  }

  @Get('lessons/:lessonId/attachments')
  @ApiOperation({ summary: 'List attachments for a lesson' })
  @ApiParam({ name: 'lessonId', type: String })
  async findByLesson(@Param('lessonId') lessonId: string) {
    return this.attachmentsService.findByLesson(lessonId);
  }

  @Delete('attachments/:id')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
