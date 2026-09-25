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
import { VenuesService } from './venues.service';
import { CreateVenueDto, UpdateVenueDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { Permissions, Public } from '@common/decorators';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all training venues and rooms' })
  async findAll(
    @Query('branch') branch?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.venuesService.findAll({
      branch,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get details of a single training venue' })
  async findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Get(':id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if a venue is available for a given time window' })
  async checkAvailability(
    @Param('id') id: string,
    @Query('scheduledAt') scheduledAt: string,
    @Query('durationMinutes') durationMinutes: number,
    @Query('excludeSessionId') excludeSessionId?: string,
  ) {
    return this.venuesService.checkAvailability(
      id,
      new Date(scheduledAt),
      Number(durationMinutes) || 60,
      excludeSessionId,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Permissions('venue.manage')
  @ApiOperation({ summary: 'Register a new training venue or physical classroom' })
  async create(@Body() dto: CreateVenueDto) {
    return this.venuesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Permissions('venue.manage')
  @ApiOperation({ summary: 'Update training venue details' })
  async update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.venuesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Permissions('venue.manage')
  @ApiOperation({ summary: 'Delete or deactivate a training venue' })
  async remove(@Param('id') id: string) {
    return this.venuesService.remove(id);
  }
}

