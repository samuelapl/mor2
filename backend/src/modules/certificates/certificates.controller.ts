import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CertificatesService } from './certificates.service';
import { CurrentUser, Public, Roles } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Issue a certificate (manual/admin)' })
  async issue(@Query('userId') userId: string, @Query('courseId') courseId: string) {
    return this.certificatesService.issue(userId, courseId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my certificates' })
  async myCertificates(@CurrentUser() user: AuthenticatedUser) {
    return this.certificatesService.findByUser(user.id);
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'List certificates for a user' })
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
  async findOne(@Param('id') id: string) {
    return this.certificatesService.findById(id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed download URL for the certificate PDF' })
  @ApiParam({ name: 'id', type: String })
  async download(@Param('id') id: string) {
    const cert = await this.certificatesService.findById(id);
    return { downloadUrl: cert.downloadUrl };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(RoleName.TRAINING_ADMIN, RoleName.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Revoke a certificate' })
  @ApiParam({ name: 'id', type: String })
  async revoke(@Param('id') id: string) {
    return this.certificatesService.revoke(id);
  }
}
