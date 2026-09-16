import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { SetRolePermissionsDto, CreateRoleDto } from './dto';
import { Permissions, Roles } from '@common/decorators';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('admin-permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.SYSTEM_ADMIN)
@Controller('admin')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('permissions')
  @Permissions('permission.manage')
  @ApiOperation({ summary: 'List the full permission registry, grouped by resource' })
  async listPermissions() {
    return this.permissionsService.listPermissionsGroupedByResource();
  }

  @Get('roles')
  @Permissions('role.view')
  @ApiOperation({ summary: 'List the 6 roles with their granted permission codes' })
  async listRoles() {
    return this.permissionsService.listRolesWithPermissions();
  }

  @Post('roles')
  @Permissions('permission.manage')
  @ApiOperation({ summary: 'Create a new role (starts with zero permissions)' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.permissionsService.createRole(dto);
  }

  @Delete('roles/:id')
  @Permissions('permission.manage')
  @ApiOperation({ summary: 'Delete a non-built-in role (rejected if any user still holds it)' })
  @ApiParam({ name: 'id', type: String })
  async deleteRole(@Param('id') id: string) {
    return this.permissionsService.deleteRole(id);
  }

  @Post('roles/:id/permissions')
  @Permissions('permission.manage')
  @ApiOperation({ summary: "Replace a role's full permission set" })
  @ApiParam({ name: 'id', type: String })
  async setRolePermissions(@Param('id') roleId: string, @Body() dto: SetRolePermissionsDto) {
    return this.permissionsService.setRolePermissions(roleId, dto.permissionIds);
  }

  @Delete('roles/:id/permissions/:permissionId')
  @Permissions('permission.manage')
  @ApiOperation({ summary: 'Revoke a single permission from a role' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'permissionId', type: String })
  async revokeRolePermission(
    @Param('id') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.permissionsService.revokeRolePermission(roleId, permissionId);
  }

  @Get('users/:id/permissions')
  @Permissions('user.view')
  @ApiOperation({ summary: "Get a user's effective permissions (debug/support)" })
  @ApiParam({ name: 'id', type: String })
  async userPermissions(@Param('id') userId: string) {
    return this.permissionsService.effectivePermissionsForUser(userId);
  }
}
