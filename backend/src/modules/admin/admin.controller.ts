import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AdminService } from './admin.service';
import { DateRangeDto } from './dto';
import { Roles } from '@common/decorators';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.TRAINING_ADMIN)
  @ApiOperation({ summary: 'Get dashboard statistics (system/training admin)' })
  async stats(@Query() dto: DateRangeDto) {
    return this.adminService.getDashboardStats(dto);
  }

  @Get('roles/distribution')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.TRAINING_ADMIN)
  @ApiOperation({ summary: 'Get user role distribution' })
  async roleDistribution() {
    return this.adminService.getRoleDistribution();
  }

  @Get('system/health')
  @Roles(RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Get system health status' })
  async health() {
    return this.adminService.getSystemHealth();
  }
}
