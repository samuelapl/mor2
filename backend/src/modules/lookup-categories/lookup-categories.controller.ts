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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LookupCategoryType } from '@prisma/client';
import { LookupCategoriesService } from './lookup-categories.service';
import { CreateLookupCategoryDto, UpdateLookupCategoryDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { Permissions, Public } from '@common/decorators';

@ApiTags('lookup-categories')
@Controller('lookup-categories')
export class LookupCategoriesController {
  constructor(private readonly service: LookupCategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List lookup categories (optionally filtered by type)' })
  async findAll(
    @Query('type') type?: LookupCategoryType,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(type, includeInactive === 'true');
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single lookup category' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Permissions('category.manage')
  @ApiOperation({ summary: 'Create a lookup category' })
  async create(@Body() dto: CreateLookupCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Permissions('category.manage')
  @ApiOperation({ summary: 'Update a lookup category' })
  async update(@Param('id') id: string, @Body() dto: UpdateLookupCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Permissions('category.manage')
  @ApiOperation({ summary: 'Delete a lookup category' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
