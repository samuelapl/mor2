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
import { OptionalAuth, Permissions } from '@common/decorators';
import { LawCategoriesService } from './law-categories.service';
import {
  CreateLawCategoryDto,
  QueryLawCategoryDto,
  UpdateLawCategoryDto,
} from './dto';

@ApiTags('law-categories')
@Controller(['laws/categories', 'legal-documents/categories'])
export class LawCategoriesController {
  constructor(private readonly service: LawCategoriesService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'List law categories (filtered by domain and instrumentType)' })
  async findAll(@Query() query: QueryLawCategoryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: 'Get a single law category by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Permissions('laws.manage')
  @ApiOperation({ summary: 'Create a new dynamic law category' })
  async create(@Body() dto: CreateLawCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Permissions('laws.manage')
  @ApiOperation({ summary: 'Update a law category' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLawCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Permissions('laws.manage')
  @ApiOperation({ summary: 'Delete a law category (prevented if documents exist)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

