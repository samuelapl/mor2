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
import { RoleName, SessionStatus } from '@prisma/client';
import { LiveSessionsService } from './live-sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto';
import { CurrentUser, Roles } from '@common/decorators';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('live-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Get('live-sessions')
  @ApiOperation({ summary: 'List live sessions' })
  async findAll(@Query() query: PaginationQuery & { status?: SessionStatus; courseId?: string }) {
    return this.liveSessionsService.findAll(query);
  }

  @Get('live-sessions/upcoming/me')
  @ApiOperation({ summary: 'Upcoming sessions for my enrolled courses' })
  async upcoming(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.liveSessionsService.upcomingForUser(user.id, query);
  }

  @Get('live-sessions/:id')
  @ApiOperation({ summary: 'Get live session details' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.liveSessionsService.findById(id);
  }

  @Post('courses/:courseId/live-sessions')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Schedule a live session for a course' })
  @ApiParam({ name: 'courseId', type: String })
  async create(@Param('courseId') courseId: string, @Body() dto: CreateSessionDto) {
    return this.liveSessionsService.create(courseId, dto);
  }

  @Patch('live-sessions/:id')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update a live session' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.liveSessionsService.update(id, dto);
  }

  @Patch('live-sessions/:id/status')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Change session status (start, complete, cancel)' })
  @ApiParam({ name: 'id', type: String })
  async changeStatus(@Param('id') id: string, @Body('status') status: SessionStatus) {
    return this.liveSessionsService.changeStatus(id, status);
  }

  @Delete('live-sessions/:id')
  @Roles(RoleName.COURSE_OWNER, RoleName.TRAINER, RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Soft delete a live session' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string) {
    return this.liveSessionsService.softDelete(id);
  }
}
