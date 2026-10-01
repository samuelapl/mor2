import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { AuditService } from '@modules/audit/audit.service';
import { CreateCertificateTemplateDto, UpdateCertificateTemplateDto } from './dto';

@Injectable()
export class CertificateTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(includeArchived = true) {
    return this.prisma.certificateTemplate.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: [{ isActive: 'desc' }, { isArchived: 'asc' }, { updatedAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async findActive() {
    return this.prisma.certificateTemplate.findFirst({
      where: { isActive: true, isArchived: false },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!template) throw new NotFoundException('Certificate template not found');
    return template;
  }

  async create(dto: CreateCertificateTemplateDto, createdById: string) {
    const created = await this.prisma.certificateTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        backgroundUrl: dto.backgroundUrl,
        fields: (dto.fields ?? []) as unknown as Prisma.InputJsonValue,
        createdById,
      },
    });

    await this.auditService.record({
      userId: createdById,
      action: 'CREATE',
      entity: 'certificate_template',
      entityId: created.id,
      newValues: { name: created.name, version: created.version },
    });

    return created;
  }

  async update(id: string, dto: UpdateCertificateTemplateDto, userId?: string) {
    const existing = await this.findById(id);

    const data: Prisma.CertificateTemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.backgroundUrl !== undefined) data.backgroundUrl = dto.backgroundUrl;
    if (dto.fields !== undefined) data.fields = dto.fields as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.certificateTemplate.update({ where: { id }, data });

    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'certificate_template',
      entityId: id,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
    });

    return updated;
  }

  /** Sets this template as the single active one used for new certificates (version++). */
  async activate(id: string, userId?: string) {
    await this.findById(id);

    await this.prisma.$transaction([
      this.prisma.certificateTemplate.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.certificateTemplate.update({
        where: { id },
        data: { isActive: true, isArchived: false, version: { increment: 1 } },
      }),
    ]);

    await this.auditService.record({
      userId,
      action: 'ACTIVATE',
      entity: 'certificate_template',
      entityId: id,
    });

    return this.findById(id);
  }

  async deactivate(id: string, userId?: string) {
    await this.findById(id);
    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.record({
      userId,
      action: 'DEACTIVATE',
      entity: 'certificate_template',
      entityId: id,
    });

    return updated;
  }

  async archive(id: string, userId?: string) {
    await this.findById(id);
    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });

    await this.auditService.record({
      userId,
      action: 'ARCHIVE',
      entity: 'certificate_template',
      entityId: id,
    });

    return updated;
  }

  async unarchive(id: string, userId?: string) {
    await this.findById(id);
    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { isArchived: false },
    });

    await this.auditService.record({
      userId,
      action: 'UNARCHIVE',
      entity: 'certificate_template',
      entityId: id,
    });

    return updated;
  }

  async duplicate(id: string, userId?: string) {
    const template = await this.findById(id);

    const created = await this.prisma.certificateTemplate.create({
      data: {
        name: `${template.name} (copy)`,
        description: template.description,
        backgroundUrl: template.backgroundUrl,
        fields: (template.fields ?? []) as unknown as Prisma.InputJsonValue,
        isActive: false,
        isArchived: false,
        version: 1,
        createdById: userId,
      },
    });

    await this.auditService.record({
      userId,
      action: 'DUPLICATE',
      entity: 'certificate_template',
      entityId: created.id,
      newValues: { sourceId: id, name: created.name },
    });

    return created;
  }

  async remove(id: string, userId?: string) {
    await this.findById(id);

    // Rule: Do not delete templates already used by certificates.
    const inUseCount = await this.prisma.certificate.count({ where: { templateId: id } });
    if (inUseCount > 0) {
      throw new BadRequestException(
        `Cannot delete template: it is in use by ${inUseCount} issued certificate(s). Please archive it instead.`,
      );
    }

    await this.prisma.certificateTemplate.delete({ where: { id } });

    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'certificate_template',
      entityId: id,
    });

    return { message: 'Certificate template deleted' };
  }
}
