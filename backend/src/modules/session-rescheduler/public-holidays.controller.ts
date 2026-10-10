import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@config/prisma.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';
import { Permissions } from '@common/decorators';
import { DEFAULT_ETHIOPIAN_HOLIDAYS } from './session-rescheduler.constants';

@ApiTags('admin-public-holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/public-holidays')
export class PublicHolidaysController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered public holidays' })
  async findAll() {
    return this.prisma.publicHoliday.findMany({
      orderBy: { holidayDate: 'asc' },
    });
  }

  @Post()
  @Permissions('system.manage')
  @ApiOperation({ summary: 'Create a registered public holiday' })
  async create(
    @Body()
    body: {
      nameEn: string;
      nameAm?: string;
      holidayDate: string; // YYYY-MM-DD
      isActive?: boolean;
    },
  ) {
    return this.prisma.publicHoliday.create({
      data: {
        nameEn: body.nameEn,
        nameAm: body.nameAm || null,
        holidayDate: new Date(body.holidayDate),
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });
  }

  @Patch(':id')
  @Permissions('system.manage')
  @ApiOperation({ summary: 'Update public holiday details or active status' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      nameEn?: string;
      nameAm?: string;
      holidayDate?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.publicHoliday.update({
      where: { id },
      data: {
        ...(body.nameEn ? { nameEn: body.nameEn } : {}),
        ...(body.nameAm !== undefined ? { nameAm: body.nameAm } : {}),
        ...(body.holidayDate ? { holidayDate: new Date(body.holidayDate) } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
  }

  @Delete(':id')
  @Permissions('system.manage')
  @ApiOperation({ summary: 'Delete a registered public holiday' })
  async remove(@Param('id') id: string) {
    return this.prisma.publicHoliday.delete({
      where: { id },
    });
  }

  @Post('seed-defaults')
  @Permissions('system.manage')
  @ApiOperation({ summary: 'Seed standard statutory Ethiopian public holidays' })
  async seedDefaults() {
    let createdCount = 0;
    for (const h of DEFAULT_ETHIOPIAN_HOLIDAYS) {
      const date = new Date(h.holidayDate);
      const existing = await this.prisma.publicHoliday.findFirst({
        where: { holidayDate: date },
      });
      if (!existing) {
        await this.prisma.publicHoliday.create({
          data: {
            nameEn: h.nameEn,
            nameAm: h.nameAm,
            holidayDate: date,
            isActive: true,
          },
        });
        createdCount++;
      }
    }
    return { success: true, count: createdCount };
  }
}

