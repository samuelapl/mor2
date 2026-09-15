import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CreateCertificateTemplateDto, UpdateCertificateTemplateDto } from './dto';

@Injectable()
export class CertificateTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.certificateTemplate.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async findActive() {
    return this.prisma.certificateTemplate.findFirst({
      where: { isActive: true },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!template) throw new NotFoundException('Certificate template not found');
    return template;
  }

  async create(dto: CreateCertificateTemplateDto, createdById: string) {
    return this.prisma.certificateTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        backgroundUrl: dto.backgroundUrl,
        fields: (dto.fields ?? []) as unknown as Prisma.InputJsonValue,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateCertificateTemplateDto) {
    await this.findById(id);

    const data: Prisma.CertificateTemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.backgroundUrl !== undefined) data.backgroundUrl = dto.backgroundUrl;
    if (dto.fields !== undefined) data.fields = dto.fields as unknown as Prisma.InputJsonValue;

    return this.prisma.certificateTemplate.update({ where: { id }, data });
  }

  /** Sets this template as the single active one used for new certificates (version++). */
  async activate(id: string) {
    await this.findById(id);

    await this.prisma.$transaction([
      this.prisma.certificateTemplate.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.certificateTemplate.update({
        where: { id },
        data: { isActive: true, version: { increment: 1 } },
      }),
    ]);

    return this.findById(id);
  }

  async duplicate(id: string) {
    const template = await this.findById(id);

    return this.prisma.certificateTemplate.create({
      data: {
        name: `${template.name} (copy)`,
        description: template.description,
        backgroundUrl: template.backgroundUrl,
        fields: (template.fields ?? []) as unknown as Prisma.InputJsonValue,
        isActive: false,
        version: 1,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.certificateTemplate.delete({ where: { id } });
    return { message: 'Certificate template deleted' };
  }
}