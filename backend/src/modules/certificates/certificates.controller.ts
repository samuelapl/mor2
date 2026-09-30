import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CertificatesService } from './certificates.service';
import { CurrentUser, Permissions, Public, Roles } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';
import { PermissionsGuard } from '@modules/permissions/guards/permissions.guard';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  private canManageCertificates(user: AuthenticatedUser): boolean {
    return (
      user.roles.includes(RoleName.SYSTEM_ADMIN) ||
      user.roles.includes(RoleName.TRAINING_ADMIN)
    );
  }

  /**
   * List all certificates with search and filter.
   * Guarded by CERTIFICATE_MANAGE permission.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions('CERTIFICATE_MANAGE', 'certificate.manage')
  @ApiOperation({ summary: 'List all issued certificates (Admin/Manager)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.certificatesService.findAll({ search, status, page, limit });
  }

  /**
   * Disallow manual "Issue Certificate" workflow as per requirements.
   */
  @Post('issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manual certificate issuance (Disabled)' })
  async issue() {
    throw new BadRequestException(
      'Manual certificate issuance is disabled. Certificates are automatically generated when learners satisfy course requirements.',
    );
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim certificate upon course completion' })
  async claim(@CurrentUser() user: AuthenticatedUser, @Query('courseId') courseId: string) {
    return this.certificatesService.maybeIssueForCompletion(user.id, courseId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current learner certificates' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async myCertificates(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.certificatesService.findByUser(user.id, { search, status });
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'List certificates for a user (Admin)' })
  @ApiParam({ name: 'userId', type: String })
  async byUser(@Param('userId') userId: string) {
    return this.certificatesService.findByUser(userId);
  }

  @Get('verify')
  @Public()
  @ApiOperation({ summary: 'Public certificate verification by code' })
  async verify(@Query('code') code: string) {
    return this.certificatesService.verifyByCode(code);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const cert = await this.certificatesService.findById(id);
    if (!this.canManageCertificates(user) && cert.userId !== user.id) {
      throw new ForbiddenException('You can only access your own certificates');
    }
    return cert;
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed download URL for the certificate PDF with optional language' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'lang', required: false, type: String })
  async download(
    @Param('id') id: string,
    @Query('lang') lang: string = 'en',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cert = await this.certificatesService.findById(id);
    if (!this.canManageCertificates(user) && cert.userId !== user.id) {
      throw new ForbiddenException('You can only access your own certificates');
    }
    return this.certificatesService.downloadPdf(id, lang, user.id);
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions('CERTIFICATE_MANAGE', 'certificate.manage')
  @ApiOperation({ summary: 'Revoke a certificate with reason' })
  @ApiParam({ name: 'id', type: String })
  async revoke(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certificatesService.revoke(id, body?.reason, user.id);
  }

  @Post(':id/reissue')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions('CERTIFICATE_MANAGE', 'certificate.manage')
  @ApiOperation({ summary: 'Reissue/supersede a certificate' })
  @ApiParam({ name: 'id', type: String })
  async reissue(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certificatesService.reissue(id, user.id, body?.reason);
  }

  @Get(':id/audit')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions('CERTIFICATE_MANAGE', 'certificate.manage')
  @ApiOperation({ summary: 'Get audit history for a certificate' })
  @ApiParam({ name: 'id', type: String })
  async getAuditHistory(@Param('id') id: string) {
    return this.certificatesService.getAuditHistory(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions('CERTIFICATE_MANAGE', 'certificate.manage')
  @ApiOperation({ summary: 'Revoke a certificate (Compatibility endpoint)' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificatesService.revoke(id, 'Revoked via DELETE', user.id);
  }
}
