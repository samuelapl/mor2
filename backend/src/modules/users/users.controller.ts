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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApprovalStatus, RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  ChangePasswordDto,
  AssignRoleDto,
  BulkCreateUsersDto,
  AdminResetPasswordDto,
  RejectRegistrationDto,
} from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('user.view')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({ name: 'registrationStatus', enum: ApprovalStatus, required: false })
  async findAll(
    @Query() query: PaginationQuery & { role?: RoleName; registrationStatus?: ApprovalStatus },
  ) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.id);
  }

  @Get('trainers')
  @Permissions('course.assign_trainer')
  @ApiOperation({ summary: 'List active trainers (for trainer-assignment pickers only)' })
  async findTrainers() {
    return this.usersService.findAll({ role: RoleName.TRAINER, limit: 100 });
  }

  @Get(':id')
  @Permissions('user.view')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto);
  }

  @Patch(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Update user by ID (admin)' })
  @ApiParam({ name: 'id', type: String })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('bulk')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Bulk-create users from a spreadsheet import (idempotent by email)' })
  async bulkCreate(@Body() dto: BulkCreateUsersDto) {
    return this.usersService.bulkCreate(dto);
  }

  @Patch(':id/password')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Force a password reset for a user (system admin)' })
  @ApiParam({ name: 'id', type: String })
  async adminResetPassword(@Param('id') id: string, @Body() dto: AdminResetPasswordDto) {
    return this.usersService.adminResetPassword(id, dto.newPassword);
  }

  @Post('assign-role')
  @Permissions('role.manage')
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignRole(@Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(dto);
  }

  @Delete(':id/roles/:role')
  @Permissions('role.manage')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'role', enum: RoleName })
  async removeRole(@Param('id') id: string, @Param('role') role: RoleName) {
    return this.usersService.removeRole(id, role);
  }

  @Post(':id/approve-registration')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Approve a pending registration' })
  @ApiParam({ name: 'id', type: String })
  async approveRegistration(@Param('id') id: string) {
    return this.usersService.approveRegistration(id);
  }

  @Post(':id/reject-registration')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Reject a pending registration with an optional reason' })
  @ApiParam({ name: 'id', type: String })
  async rejectRegistration(@Param('id') id: string, @Body() dto: RejectRegistrationDto) {
    return this.usersService.rejectRegistration(id, dto.reason);
  }

  @Post(':id/deactivate')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Deactivate a user' })
  @ApiParam({ name: 'id', type: String })
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Delete(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }
}
