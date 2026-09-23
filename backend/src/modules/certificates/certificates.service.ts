import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CERTIFICATE_CONFIG } from '@config/constants';
import { FilesService } from '@modules/files/files.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { PDFDocument, PDFImage, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib';
import { generateVerificationCode, nextCertificateNumber } from './certificate-number.util';

type CertificateContext = {
  holderName: string;
  courseTitle: string;
  courseCode: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: Date;
  expiresAt: Date;
};

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async issue(userId: string, courseId: string) {
    const [course, existing] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } }),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (existing)
      throw new ConflictException('Certificate already issued for this user and course');

    const lastCertificate = await this.prisma.certificate.findFirst({
      orderBy: { certificateNumber: 'desc' },
    });

    const certificateNumber = nextCertificateNumber(
      CERTIFICATE_CONFIG.numberPrefix,
      new Date().getFullYear(),
      lastCertificate?.certificateNumber ?? null,
    );
    const verificationCode = generateVerificationCode(CERTIFICATE_CONFIG.verificationCodeLength);
    const issuedAt = new Date();
    const expiresAt = new Date(
      Date.now() + CERTIFICATE_CONFIG.validityMonths * 30 * 24 * 60 * 60 * 1000,
    );

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const activeTemplate = await this.prisma.certificateTemplate.findFirst({
      where: { isActive: true },
    });

    let pdfKey: string | null = null;
    try {
      pdfKey = await this.generatePdf(
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Learner',
        course.titleEn || course.titleAm,
        course.code,
        certificateNumber,
        verificationCode,
        issuedAt,
        expiresAt,
        activeTemplate ?? null,
      );
    } catch {
      // PDF generation is best-effort; certificate still issues without a PDF file.
    }

    const cert = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        templateId: activeTemplate?.id ?? null,
        certificateNumber,
        verificationCode,
        issuedAt,
        expiresAt,
        pdfFileUrl: pdfKey,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        template: true,
      },
    });

    try {
      await this.notificationsService.send(
        userId,
        NotificationType.CERTIFICATE_ISSUED,
        {
          en: 'Certificate issued',
          am: 'ማህመር ተሰጥቷል',
        },
        {
          en: `Your certificate for ${course.titleEn || course.titleAm} has been issued (${certificateNumber}).`,
          am: `ለ${course.titleAm || course.titleEn} ማህመርዎ ተሰጥቷል (${certificateNumber}).`,
        },
        { certificateId: cert.id, courseId },
      );
    } catch {
      // notification failure is non-fatal
    }

    return this.withDownloadUrl(cert);
  }

  async findById(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        template: true,
      },
    });

    if (!certificate) throw new NotFoundException('Certificate not found');

    return this.withDownloadUrl(certificate);
  }

  async findByUser(userId: string) {
    const certs = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        template: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    return Promise.all(certs.map((c) => this.withDownloadUrl(c)));
  }

  async findByCourse(courseId: string) {
    const certs = await this.prisma.certificate.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    return Promise.all(certs.map((c) => this.withDownloadUrl(c)));
  }

  async verifyByCode(verificationCode: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        user: { select: { firstName: true, lastName: true } },
        course: { select: { titleEn: true, titleAm: true, code: true } },
      },
    });

    if (!certificate)
      throw new NotFoundException('No certificate found for this verification code');

    const now = new Date();
    return {
      valid: certificate.expiresAt ? certificate.expiresAt > now : true,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      holder: `${certificate.user.firstName} ${certificate.user.lastName}`,
      course: certificate.course.titleEn || certificate.course.titleAm,
      downloadUrl: certificate.pdfFileUrl
        ? await this.filesService.getPresignedUrl(certificate.pdfFileUrl, 3600)
        : null,
    };
  }

  async revoke(id: string) {
    const cert = await this.findById(id);
    await this.prisma.certificate.delete({ where: { id } });

    if (cert.pdfFileUrl) {
      try {
        await this.filesService.remove(cert.pdfFileUrl);
      } catch {
        /* ignore */
      }
    }
    return { message: 'Certificate revoked' };
  }

  /**
   * Auto-issue a certificate when a learner completes a course,
   * provided the course has an assessment and the learner has passed it.
   * Returns the existing certificate if already issued, or null if not yet eligible.
   */
  async maybeIssueForCompletion(userId: string, courseId: string) {
    const activeTemplate = await this.prisma.certificateTemplate.findFirst({
      where: { isActive: true },
    });

    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        template: true,
      },
    });
    if (existing) {
      if (activeTemplate && existing.templateId !== activeTemplate.id) {
        const updated = await this.prisma.certificate.update({
          where: { id: existing.id },
          data: { templateId: activeTemplate.id },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
            template: true,
          },
        });
        return this.withDownloadUrl(updated);
      }
      return this.withDownloadUrl(existing);
    }

    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId },
      select: { id: true, lessons: { select: { id: true } } },
    });
    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length === 0) return null;

    const completedLessons = await this.prisma.lessonCompletion.count({
      where: { userId, lessonId: { in: lessonIds }, completed: true },
    });
    if (completedLessons !== lessonIds.length) return null;

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId, type: AssessmentType.FINAL_ASSESSMENT },
      select: { id: true },
    });
    if (assessments.length > 0) {
      const passed = await this.prisma.assessmentAttempt.findFirst({
        where: { assessmentId: { in: assessments.map((a) => a.id) }, userId, passed: true },
        orderBy: { submittedAt: 'desc' },
      });
      if (!passed) return null;
    }

    return this.issue(userId, courseId);
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private async generatePdf(
    holderName: string,
    courseTitle: string,
    courseCode: string,
    certificateNumber: string,
    verificationCode: string,
    issuedAt: Date,
    expiresAt: Date,
    template?: { backgroundUrl: string | null; fields: Prisma.JsonValue } | null,
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape

    const context: CertificateContext = {
      holderName,
      courseTitle,
      courseCode,
      certificateNumber,
      verificationCode,
      issuedAt,
      expiresAt,
    };

    if (template && template.backgroundUrl) {
      await this.renderTemplatedPdf(pdfDoc, page, template, context);
    } else {
      await this.renderDefaultPdf(pdfDoc, page, context);
    }

    const pdfBytes = await pdfDoc.save();
    return this.filesService.uploadBuffer(
      Buffer.from(pdfBytes),
      'certificate',
      'application/pdf',
      `${certificateNumber}.pdf`,
    );
  }

  /** Full-bleed background + configurable text fields rendered in field order. */
  private async renderTemplatedPdf(
    pdfDoc: PDFDocument,
    page: PDFPage,
    template: { backgroundUrl: string | null; fields: Prisma.JsonValue },
    ctx: CertificateContext,
  ) {
    const { width, height } = page.getSize();

    if (template.backgroundUrl) {
      try {
        const buffer = await this.filesService.downloadFromUrl(template.backgroundUrl);
        const image = await this.embedImage(pdfDoc, buffer);
        if (image) {
          const scale = Math.max(width / image.width, height / image.height);
          page.drawImage(image, {
            x: (width - image.width * scale) / 2,
            y: (height - image.height * scale) / 2,
            width: image.width * scale,
            height: image.height * scale,
          });
        }
      } catch {
        // background failure is non-fatal — fields still render on a blank page
      }
    }

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fields = Array.isArray(template.fields) ? (template.fields as any[]) : [];

    for (const field of fields) {
      const value = this.resolveFieldValue(field?.key, ctx);
      if (!value) continue;

      const font = field.bold ? helveticaBold : helvetica;
      const size = typeof field.size === 'number' ? field.size : 12;
      const textWidth = font.widthOfTextAtSize(value, size);

      let x = typeof field.x === 'number' ? field.x : width / 2;
      if (field.align === 'center') x = x - textWidth / 2;
      else if (field.align === 'right') x = x - textWidth;

      page.drawText(value, {
        x,
        y: typeof field.y === 'number' ? field.y : height / 2,
        size,
        font,
        color: this.hexToRgb(field.color) ?? rgb(0.1, 0.1, 0.1),
      });
    }
  }

  private resolveFieldValue(key: string, ctx: CertificateContext): string {
    switch (key) {
      case 'holderName':
        return ctx.holderName;
      case 'courseTitle':
        return ctx.courseTitle;
      case 'courseCode':
        return ctx.courseCode;
      case 'orgName':
        return 'Ministry of Revenues · ETIMS Academy';
      case 'certificateNumber':
        return ctx.certificateNumber;
      case 'verificationCode':
        return ctx.verificationCode;
      case 'issuedAt':
        return ctx.issuedAt.toLocaleDateString('en-GB');
      case 'expiresAt':
        return ctx.expiresAt.toLocaleDateString('en-GB');
      default:
        return '';
    }
  }

  private async embedImage(pdfDoc: PDFDocument, buffer: Buffer): Promise<PDFImage | null> {
    try {
      const isPng = buffer.length > 8 && buffer.readUInt32BE(0) === 0x89504e47;
      const isJpg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
      if (isPng) return await pdfDoc.embedPng(buffer);
      if (isJpg) return await pdfDoc.embedJpg(buffer);
      return null;
    } catch {
      return null;
    }
  }

  private hexToRgb(hex?: string): RGB | null {
    if (!hex) return null;
    const match = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/);
    if (!match) return null;
    const value = parseInt(match[1], 16);
    return rgb(((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255);
  }

  /** Default layout used when no template is configured (consistent with legacy behaviour). */
  private async renderDefaultPdf(pdfDoc: PDFDocument, page: PDFPage, ctx: CertificateContext) {
    const { width, height } = page.getSize();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const centreX = width / 2;

    page.drawRectangle({
      x: 0,
      y: height - 8,
      width,
      height: 8,
      color: rgb(0.85, 0.65, 0.13),
    });
    page.drawText('Certificate of Completion', {
      x: centreX - helveticaBold.widthOfTextAtSize('Certificate of Completion', 26) / 2,
      y: height - 80,
      size: 26,
      font: helveticaBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    page.drawText('Ministry of Revenues · ETIMS Academy', {
      x: centreX - helvetica.widthOfTextAtSize('Ministry of Revenues · ETIMS Academy', 11) / 2,
      y: height - 110,
      size: 11,
      font: helvetica,
      color: rgb(0.6, 0.5, 0.1),
    });
    page.drawText('This certifies that', {
      x: centreX - helvetica.widthOfTextAtSize('This certifies that', 12) / 2,
      y: height - 160,
      size: 12,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(ctx.holderName, {
      x: centreX - helveticaBold.widthOfTextAtSize(ctx.holderName, 22) / 2,
      y: height - 190,
      size: 22,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('has successfully completed', {
      x: centreX - helvetica.widthOfTextAtSize('has successfully completed', 12) / 2,
      y: height - 215,
      size: 12,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    const courseLine = `${ctx.courseTitle} (${ctx.courseCode})`;
    page.drawText(courseLine, {
      x: centreX - helveticaBold.widthOfTextAtSize(courseLine, 16) / 2,
      y: height - 245,
      size: 16,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: centreX - 80, y: height - 280 },
      end: { x: centreX + 80, y: height - 280 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const footerY = height - 315;
    page.drawText(`Certificate: ${ctx.certificateNumber}`, {
      x: centreX - helvetica.widthOfTextAtSize(`Certificate: ${ctx.certificateNumber}`, 10) / 2,
      y: footerY,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Issued: ${ctx.issuedAt.toLocaleDateString('en-GB')}`, {
      x: centreX - 120,
      y: footerY - 22,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Expires: ${ctx.expiresAt.toLocaleDateString('en-GB')}`, {
      x: centreX + 20,
      y: footerY - 22,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText('Verify at ELTMS with your verification code.', {
      x:
        centreX -
        helvetica.widthOfTextAtSize('Verify at ELTMS with your verification code.', 9) / 2,
      y: footerY - 48,
      size: 9,
      font: helvetica,
      color: rgb(0.55, 0.55, 0.55),
    });
  }

  private async withDownloadUrl<T extends { pdfFileUrl: string | null }>(
    cert: T,
  ): Promise<T & { downloadUrl: string | null }> {
    if (!cert.pdfFileUrl) return { ...cert, downloadUrl: null };
    try {
      const url = await this.filesService.getPresignedUrl(cert.pdfFileUrl, 3600);
      return { ...cert, downloadUrl: url };
    } catch {
      return { ...cert, downloadUrl: null };
    }
  }
}
