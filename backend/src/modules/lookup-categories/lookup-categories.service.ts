import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LookupCategoryType } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CacheService } from '@common/cache';
import { CreateLookupCategoryDto, UpdateLookupCategoryDto } from './dto';

const LOOKUP_TTL_SECONDS = 21600; // 6 hours

@Injectable()
export class LookupCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(type?: LookupCategoryType, includeInactive = false) {
    const cacheKey = `lookup:all:${type || 'ALL'}:${includeInactive ? '1' : '0'}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.prisma.lookupCategory.findMany({
          where: {
            ...(type ? { type } : {}),
            ...(includeInactive ? {} : { isActive: true }),
          },
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { labelEn: 'asc' }],
        }),
      LOOKUP_TTL_SECONDS,
    );
  }

  async findOne(id: string) {
    const cacheKey = `lookup:id:${id}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const item = await this.prisma.lookupCategory.findUnique({ where: { id } });
        if (!item) throw new NotFoundException(`Lookup category ${id} not found`);
        return item;
      },
      LOOKUP_TTL_SECONDS,
    );
  }

  async create(dto: CreateLookupCategoryDto) {
    const value = dto.value.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.prisma.lookupCategory.findUnique({
      where: { type_value: { type: dto.type, value } },
    });
    if (existing) {
      throw new ConflictException(
        `A category with value "${value}" already exists for type ${dto.type}`,
      );
    }
    const created = await this.prisma.lookupCategory.create({
      data: {
        type: dto.type,
        value,
        labelEn: dto.labelEn.trim(),
        labelAm: dto.labelAm.trim(),
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.cacheService.delByPattern('lookup:*');
    return created;
  }

  async update(id: string, dto: UpdateLookupCategoryDto) {
    await this.findOne(id);
    const updated = await this.prisma.lookupCategory.update({
      where: { id },
      data: {
        labelEn: dto.labelEn !== undefined ? dto.labelEn.trim() : undefined,
        labelAm: dto.labelAm !== undefined ? dto.labelAm.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
      },
    });
    await this.cacheService.delByPattern('lookup:*');
    return updated;
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    if (item.type === 'COURSE_CATEGORY') {
      const inUse = await this.prisma.course.count({ where: { category: item.value } });
      if (inUse > 0) {
        throw new BadRequestException(
          `Cannot delete: ${inUse} course(s) use this category. Deactivate it instead.`,
        );
      }
    }
    const deleted = await this.prisma.lookupCategory.delete({ where: { id } });
    await this.cacheService.delByPattern('lookup:*');
    return deleted;
  }
}
