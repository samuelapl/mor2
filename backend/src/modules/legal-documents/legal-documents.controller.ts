import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OptionalAuth, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { LegalDocumentsService } from './legal-documents.service';
import {
  CreateLegalDocumentDto,
  QueryLegalDocumentDto,
  UpdateLegalDocumentDto,
} from './dto';

@ApiTags('legal-documents')
@Controller(['laws/documents', 'legal-documents'])
export class LegalDocumentsController {
  constructor(private readonly service: LegalDocumentsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'Search and filter legal documents (with pagination)' })
  async findAll(@Query() query: QueryLegalDocumentDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: 'Get a single legal document by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Permissions('laws.manage')
  @ApiOperation({ summary: 'Create and attach a new legal document (PDF, Gazeta cover, metadata)' })
  async create(
    @Body() dto: CreateLegalDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Permissions('laws.manage')
  @ApiOperation({ summary: 'Update a legal document' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Permissions('laws.manage')
  @ApiOperation({ summary: 'Delete (soft-delete) a legal document' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

