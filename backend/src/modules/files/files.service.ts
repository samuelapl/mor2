import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@config/prisma.service';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from '@config/constants';

export type FilePurpose =
  | 'avatar'
  | 'attachment'
  | 'certificate'
  | 'scorm'
  | 'cover'
  | 'certificate_template';

const PURPOSE_PATHS: Record<FilePurpose, string> = {
  avatar: 'avatars',
  attachment: 'attachments',
  certificate: 'certificates',
  scorm: 'scorm',
  cover: 'covers',
  certificate_template: 'certificate-templates',
};

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly minio: Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'eltms-files';
    this.minio = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });
  }

  async onModuleInit() {
    const exists = await this.minio.bucketExists(this.bucket);
    if (!exists) {
      await this.minio.makeBucket(this.bucket);
    }
  }

  async upload(
    file: Express.Multer.File,
    purpose: FilePurpose,
    metadata: { moduleId?: string; lessonId?: string; courseId?: string } = {},
  ) {
    // Validate file type against purpose
    this.validateFile(file, purpose);

    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `${PURPOSE_PATHS[purpose]}/${uuid()}.${ext}`;

    await this.minio.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'X-Original-Name': file.originalname,
    });

    const objectUrl = new URL(
      `http://${this.configService.get<string>('MINIO_ENDPOINT') || 'localhost'}:${
        this.configService.get<string>('MINIO_PORT') || '9000'
      }/${this.bucket}/${key}`,
    );

    // Record in DB
    const record = await this.prisma.attachment.create({
      data: {
        moduleId: metadata.moduleId,
        lessonId: metadata.lessonId,
        courseId: metadata.courseId,
        fileName: file.originalname,
        fileKey: key,
        fileUrl: objectUrl.toString(),
        fileType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    return record;
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    this.validateFile(file, 'avatar');

    const ext = file.originalname.split('.').pop() || 'png';
    const key = `${PURPOSE_PATHS.avatar}/${userId}.${ext}`;

    await this.minio.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const objectUrl = new URL(
      `http://${this.configService.get<string>('MINIO_ENDPOINT') || 'localhost'}:${
        this.configService.get<string>('MINIO_PORT') || '9000'
      }/${this.bucket}/${key}`,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: objectUrl.toString() },
    });

    return { avatarUrl: objectUrl.toString() };
  }

  async uploadCover(file: Express.Multer.File, courseId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    this.validateFile(file, 'cover');
    if (existing.thumbnailUrl) {
      const prevKey = existing.thumbnailUrl.split(`${this.bucket}/`)[1];
      if (prevKey) await this.removeObjectIfExists(prevKey);
    }

    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
    const key = `${PURPOSE_PATHS.cover}/${courseId}.${ext}`;

    await this.minio.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'X-Original-Name': file.originalname,
    });

    const objectUrl = new URL(
      `http://${this.configService.get<string>('MINIO_ENDPOINT') || 'localhost'}:${
        this.configService.get<string>('MINIO_PORT') || '9000'
      }/${this.bucket}/${key}`,
    );

    await this.prisma.course.update({
      where: { id: courseId },
      data: { thumbnailUrl: objectUrl.toString() },
    });

    return { thumbnailUrl: objectUrl.toString() };
  }

  async uploadCertificateTemplate(file: Express.Multer.File) {
    this.validateFile(file, 'certificate_template');

    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
    const key = `${PURPOSE_PATHS.certificate_template}/${uuid()}.${ext}`;

    await this.minio.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'X-Original-Name': file.originalname,
    });

    const objectUrl = new URL(
      `http://${this.configService.get<string>('MINIO_ENDPOINT') || 'localhost'}:${
        this.configService.get<string>('MINIO_PORT') || '9000'
      }/${this.bucket}/${key}`,
    );

    return { backgroundUrl: objectUrl.toString() };
  }

  async uploadBuffer(buffer: Buffer, purpose: FilePurpose, contentType: string, filename?: string) {
    const limit = FILE_SIZE_LIMITS[purpose];
    if (buffer.byteLength > limit) {
      const sizeMb = Math.round((limit / 1024 / 1024) * 10) / 10;
      throw new BadRequestException(`File exceeds the ${sizeMb} MB limit`);
    }

    const ext = (filename?.split('.').pop() || 'bin').toLowerCase();
    const key = `${PURPOSE_PATHS[purpose]}/${uuid()}.${ext}`;

    await this.minio.putObject(this.bucket, key, buffer, buffer.byteLength, {
      'Content-Type': contentType,
      'X-Original-Name': filename || key,
    });

    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600) {
    return this.minio.presignedGetObject(this.bucket, key, expiresIn);
  }

  async download(key: string): Promise<Buffer> {
    const stream = await this.minio.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  /** Downloads an object referenced by one of our MinIO object URLs. */
  async downloadFromUrl(url: string): Promise<Buffer> {
    const key = url.split(`/${this.bucket}/`)[1];
    if (!key) {
      throw new BadRequestException('Invalid object URL');
    }
    return this.download(key);
  }

  async checkHealth(): Promise<boolean> {
    try {
      return await this.minio.bucketExists(this.bucket);
    } catch {
      return false;
    }
  }

  async remove(key: string) {
    await this.removeObjectIfExists(key);

    await this.prisma.attachment.deleteMany({ where: { fileKey: key } });

    return { message: 'File removed successfully' };
  }

  private async removeObjectIfExists(key: string) {
    try {
      const exists = await this.minio.statObject(this.bucket, key);
      if (exists) {
        await this.minio.removeObject(this.bucket, key);
      }
    } catch {
      // Object doesn't exist — no-op
    }
  }

  private validateFile(file: Express.Multer.File, purpose: FilePurpose) {
    const limit = FILE_SIZE_LIMITS[purpose];

    if (file.size > limit) {
      const sizeMb = Math.round((limit / 1024 / 1024) * 10) / 10;
      throw new BadRequestException(`File exceeds the ${sizeMb} MB limit`);
    }

    const allowed = ALLOWED_MIME_TYPES;
    let allowedForPurpose: readonly string[];
    if (purpose === 'avatar') {
      allowedForPurpose = allowed.images;
    } else if (purpose === 'scorm') {
      allowedForPurpose = allowed.scorm;
    } else if (purpose === 'certificate') {
      allowedForPurpose = allowed.documents;
    } else if (purpose === 'cover') {
      allowedForPurpose = allowed.images;
    } else if (purpose === 'certificate_template') {
      allowedForPurpose = allowed.images;
    } else {
      allowedForPurpose = [...allowed.documents, ...allowed.video, ...allowed.archives];
    }

    if (!allowedForPurpose.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed for ${purpose}`);
    }
  }
}
