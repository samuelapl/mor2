import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CertificateTemplatesService } from './certificate-templates.service';
import { CreateCertificateTemplateDto, UpdateCertificateTemplateDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('certificate-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions('certificate.manage')
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
  update(@Param('id') id: string, @Body() dto: UpdateCertificateTemplateDto) {
    return this.certificateTemplatesService.update(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a template (becomes the single active template)' })
  @ApiParam({ name: 'id', type: String })
  activate(@Param('id') id: string) {
    return this.certificateTemplatesService.activate(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a certificate template' })
  @ApiParam({ name: 'id', type: String })
  duplicate(@Param('id') id: string) {
    return this.certificateTemplatesService.duplicate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a certificate template' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: string) {
    return this.certificateTemplatesService.remove(id);
  }
}
