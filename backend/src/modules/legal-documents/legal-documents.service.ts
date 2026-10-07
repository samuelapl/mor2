import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  CreateLegalDocumentDto,
  QueryLegalDocumentDto,
  UpdateLegalDocumentDto,
} from './dto';

@Injectable()
export class LegalDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: QueryLegalDocumentDto) {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LegalDocumentWhereInput = {
      deletedAt: null,
    };

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query?.domain || query?.instrumentType) {
      where.category = {
        ...(query.domain ? { domain: query.domain } : {}),
        ...(query.instrumentType ? { instrumentType: query.instrumentType } : {}),
      };
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.yearIssued) {
      where.yearIssued = query.yearIssued;
    }

    if (query?.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { documentNumber: { contains: term, mode: 'insensitive' } },
        { titleEn: { contains: term, mode: 'insensitive' } },
        { titleAm: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.legalDocument.count({ where }),
      this.prisma.legalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { yearIssued: { sort: 'desc', nulls: 'last' } },
          { documentNumber: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.legalDocument.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Legal document with ID ${id} not found`);
    }

    return document;
  }

  async create(dto: CreateLegalDocumentDto, userId: string) {
    // Ensure category exists
    const category = await this.prisma.lawCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Law category with ID ${dto.categoryId} not found`);
    }

    return this.prisma.legalDocument.create({
      data: {
        categoryId: dto.categoryId,
        documentNumber: dto.documentNumber.trim(),
        titleEn: dto.titleEn.trim(),
        titleAm: dto.titleAm?.trim() || null,
        descriptionEn: dto.descriptionEn?.trim() || null,
        descriptionAm: dto.descriptionAm?.trim() || null,
        status: dto.status || 'IN_FORCE',
        yearIssued: dto.yearIssued || null,
        coverImageUrl: dto.coverImageUrl?.trim() || null,
        pdfUrl: dto.pdfUrl.trim(),
        fileName: dto.fileName.trim(),
        fileSize: dto.fileSize || null,
        createdById: userId,
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateLegalDocumentDto) {
    await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.lawCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Law category with ID ${dto.categoryId} not found`);
      }
    }

    return this.prisma.legalDocument.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        documentNumber:
          dto.documentNumber !== undefined ? dto.documentNumber.trim() : undefined,
        titleEn: dto.titleEn !== undefined ? dto.titleEn.trim() : undefined,
        titleAm: dto.titleAm !== undefined ? dto.titleAm?.trim() || null : undefined,
        descriptionEn:
          dto.descriptionEn !== undefined ? dto.descriptionEn?.trim() || null : undefined,
        descriptionAm:
          dto.descriptionAm !== undefined ? dto.descriptionAm?.trim() || null : undefined,
        status: dto.status,
        yearIssued: dto.yearIssued !== undefined ? dto.yearIssued : undefined,
        coverImageUrl:
          dto.coverImageUrl !== undefined ? dto.coverImageUrl?.trim() || null : undefined,
        pdfUrl: dto.pdfUrl !== undefined ? dto.pdfUrl.trim() : undefined,
        fileName: dto.fileName !== undefined ? dto.fileName.trim() : undefined,
        fileSize: dto.fileSize !== undefined ? dto.fileSize : undefined,
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.legalDocument.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Legal document deleted successfully',
    };
  }
}

