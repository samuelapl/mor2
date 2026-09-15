import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { CreateAttachmentDto } from './dto';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAttachmentDto, uploadedById: string) {
    return this.prisma.attachment.create({
      data: {
        moduleId: dto.moduleId,
        lessonId: dto.lessonId,
        fileName: dto.fileName,
        fileKey: dto.fileKey,
        fileUrl: dto.fileKey,
        fileType: dto.fileType,
        sizeBytes: dto.sizeBytes,
        uploadedById,
      },
    });
  }

  async findByModule(moduleId: string) {
    return this.prisma.attachment.findMany({
      where: { moduleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByLesson(lessonId: string) {
    return this.prisma.attachment.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.prisma.attachment.delete({ where: { id } });

    return { message: 'Attachment deleted successfully' };
  }
}
