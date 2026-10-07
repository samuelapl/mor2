import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  CreateLawCategoryDto,
  QueryLawCategoryDto,
  UpdateLawCategoryDto,
} from './dto';

@Injectable()
export class LawCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: QueryLawCategoryDto) {
    const where: Prisma.LawCategoryWhereInput = {};

    if (query?.domain) {
      where.domain = query.domain;
    }

    if (query?.instrumentType) {
      where.instrumentType = query.instrumentType;
    }

    if (query?.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { nameEn: { contains: term, mode: 'insensitive' } },
        { nameAm: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lawCategory.findMany({
      where,
      orderBy: [{ order: 'asc' }, { nameEn: 'asc' }],
      include: {
        _count: {
          select: {
            documents: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.lawCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Law category with ID ${id} not found`);
    }

    return category;
  }

  async create(dto: CreateLawCategoryDto) {
    let order = dto.order;
    if (order === undefined || order === null) {
      const maxOrderCat = await this.prisma.lawCategory.findFirst({
        where: { domain: dto.domain, instrumentType: dto.instrumentType },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = maxOrderCat ? maxOrderCat.order + 1 : 0;
    }

    return this.prisma.lawCategory.create({
      data: {
        domain: dto.domain,
        instrumentType: dto.instrumentType,
        nameEn: dto.nameEn.trim(),
        nameAm: dto.nameAm?.trim() || null,
        description: dto.description?.trim() || null,
        order,
      },
      include: {
        _count: {
          select: {
            documents: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateLawCategoryDto) {
    await this.findOne(id);

    return this.prisma.lawCategory.update({
      where: { id },
      data: {
        domain: dto.domain,
        instrumentType: dto.instrumentType,
        nameEn: dto.nameEn !== undefined ? dto.nameEn.trim() : undefined,
        nameAm: dto.nameAm !== undefined ? dto.nameAm?.trim() || null : undefined,
        description:
          dto.description !== undefined ? dto.description?.trim() || null : undefined,
        order: dto.order,
      },
      include: {
        _count: {
          select: {
            documents: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    const docCount = await this.prisma.legalDocument.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (docCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.nameEn}" because it contains ${docCount} legal document(s). Please reassign or delete them first.`,
      );
    }

    return this.prisma.lawCategory.delete({
      where: { id },
    });
  }
}

