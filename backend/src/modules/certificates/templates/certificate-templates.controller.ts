import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CertificateTemplatesService } from './certificate-templates.service';
import { CreateCertificateTemplateDto, UpdateCertificateTemplateDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';
import { PermissionsGuard } from '@modules/permissions/guards/permissions.guard';

@ApiTags('certificate-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Permissions('CERTIFICATE_TEMPLATE_MANAGE')
@Controller('certificate-templates')
export class CertificateTemplatesController {
  constructor(private readonly certificateTemplatesService: CertificateTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List certificate templates' })
  findAll() {
    return this.certificateTemplatesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active certificate template' })
  findActive() {
    return this.certificateTemplatesService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a certificate template by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.certificateTemplatesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a certificate template' })
  create(@Body() dto: CreateCertificateTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a certificate template' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateCertificateTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.update(id, dto, user.id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a template (becomes the single active template)' })
  @ApiParam({ name: 'id', type: String })
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.activate(id, user.id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a template' })
  @ApiParam({ name: 'id', type: String })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.deactivate(id, user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a template' })
  @ApiParam({ name: 'id', type: String })
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.archive(id, user.id);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a template' })
  @ApiParam({ name: 'id', type: String })
  unarchive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.unarchive(id, user.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a certificate template' })
  @ApiParam({ name: 'id', type: String })
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.duplicate(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a certificate template' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.certificateTemplatesService.remove(id, user.id);
  }
}

