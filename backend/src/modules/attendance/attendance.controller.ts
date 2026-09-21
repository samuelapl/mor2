import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AttendanceStatus, CheckInMethod } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  MarkAttendanceDto,
  BulkMarkAttendanceDto,
  OverrideAttendanceDto,
  HeartbeatDto,
} from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Permissions('attendance.manage')
  @ApiOperation({ summary: 'Mark attendance for a learner' })
  async mark(@Body() dto: MarkAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.mark(dto, user.id);
  }

  @Post('bulk')
  @Permissions('attendance.manage')
  @ApiOperation({ summary: 'Bulk mark attendance for a session' })
  async bulkMark(@Body() dto: BulkMarkAttendanceDto) {
    return this.attendanceService.bulkMark(dto);
  }

  @Post('checkin/:sessionId')
  @Permissions('attendance.checkin')
  @ApiOperation({
    summary: 'Learner self check-in (virtual/QR/GPS/biometric) — creates an immutable record',
  })
  @ApiParam({ name: 'sessionId', type: String })
  async checkin(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('method') method?: CheckInMethod,
    @Body() body?: CheckInDto,
  ) {
    const resolvedMethod = method || body?.method || CheckInMethod.VIRTUAL;
    return this.attendanceService.checkin(
      sessionId,
      user.id,
      resolvedMethod,
      body?.latitude,
      body?.longitude,
    );
  }

  @Post(':id/override')
  @Permissions('attendance.override')
  @ApiOperation({ summary: 'Override an attendance record (system admin, audit-logged)' })
  @ApiParam({ name: 'id', type: String })
  async override(
    @Param('id') id: string,
    @Body() dto: OverrideAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.override(id, dto.status, user.id);
  }

  @Get('sessions/:sessionId')
  @Permissions('attendance.view')
  @ApiOperation({ summary: 'Get all attendance for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  async bySession(@Param('sessionId') sessionId: string) {
    return this.attendanceService.findBySession(sessionId);
  }

  @Get('sessions/:sessionId/visibility')
  @ApiOperation({ summary: 'Get session attendance visibility for current user' })
  @ApiParam({ name: 'sessionId', type: String })
  async visibility(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getVisibility(sessionId, user);
  }

  @Get('sessions/:sessionId/summary')
  @Permissions('attendance.view')
  @ApiOperation({ summary: 'Get attendance summary for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  async summary(@Param('sessionId') sessionId: string) {
    return this.attendanceService.summaryForSession(sessionId);
  }

  @Post('sessions/:sessionId/join')
  @ApiOperation({ summary: 'Record participant session join event' })
  @ApiParam({ name: 'sessionId', type: String })
  async recordJoin(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.recordJoin(sessionId, user.id);
  }

  @Post('sessions/:sessionId/heartbeat')
  @ApiOperation({ summary: 'Record presence heartbeat and compute stay percentage' })
  @ApiParam({ name: 'sessionId', type: String })
  async heartbeat(
    @Param('sessionId') sessionId: string,
    @Body() dto: HeartbeatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.recordHeartbeat(sessionId, user.id, dto?.activeSeconds ?? 15);
  }

  @Post('sessions/:sessionId/leave')
  @ApiOperation({ summary: 'Record participant session leave event' })
  @ApiParam({ name: 'sessionId', type: String })
  async recordLeave(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.recordLeave(sessionId, user.id);
  }

  @Get('sessions/:sessionId/report')
  @ApiOperation({ summary: 'Get full attendance report and calculations for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  async getReport(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getReport(sessionId);
  }

  @Post('sessions/:sessionId/send-report')
  @ApiOperation({ summary: 'Calculate final session attendance report and notify trainer' })
  @ApiParam({ name: 'sessionId', type: String })
  async sendReport(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.sendReport(sessionId, user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my attendance history' })
  async myAttendance(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findByUser(user.id);
  }
}

