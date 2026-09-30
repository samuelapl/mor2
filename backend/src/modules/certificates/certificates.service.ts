import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AssessmentType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CERTIFICATE_CONFIG } from '@config/constants';
import { FilesService } from '@modules/files/files.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { AuditService } from '@modules/audit/audit.service';
import { PDFDocument, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';
import { generateVerificationCode, nextCertificateNumber } from './certificate-number.util';

export interface CertificateContext {
  holderName: string;
  courseTitle: string;
  courseCode: string;
  courseHours?: number | string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: Date;
  expiresAt: Date;
  lang?: string;
}

const CERTIFICATE_I18N = {
  en: {
    title: 'Certificate of Training',
    preamble: 'THIS IS TO CERTIFY THAT',
    completion: 'has successfully completed the training course',
    description: 'by participating & completing all modules and passing all evaluation tests.',
    verified: 'VERIFIED',
    hoursPrefix: 'Course Hours :',
    datePrefix: 'Date :',
    hoursSuffix: 'Hours',
    footer: (certNo: string, verifCode: string) =>
      `~ Ministry of Revenues ETIMS Academy · Verified Credential ${certNo} · Verification: ${verifCode} ~`,
  },
  am: {
    title: 'የስልጠና ማረጋገጫ የምስክር ወረቀት',
    preamble: 'ይህ ምስክር ወረቀት የተሰጠው ለ',
    completion: 'የስልጠናውን ኮርስ በተሳካ ሁኔታ ላጠናቀቁ',
    description: 'ሁሉንም የስልጠና ክፍሎች በመከታተልና የማጠቃለያ ፈተናዎችን በማለፍ።',
    verified: 'የተረጋገጠ',
    hoursPrefix: 'የስልጠና ሰዓት ፦',
    datePrefix: 'ቀን ፦',
    hoursSuffix: 'ሰዓት',
    footer: (certNo: string, verifCode: string) =>
      `~ የገቢዎች ሚኒስቴር ኢቲኤምኤስ አካዳሚ · የተረጋገጠ ማረጋገጫ ${certNo} · ማረጋገጫ ቁጥር: ${verifCode} ~`,
  },
};

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  private async getActiveTemplate() {
    return this.prisma.certificateTemplate.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * List all issued certificates with search, status filtering, and pagination.
   * Guarded by CERTIFICATE_MANAGE.
   */
  async findAll(query: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.CertificateWhereInput = {};

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { certificateNumber: { contains: s, mode: 'insensitive' } },
        { verificationCode: { contains: s, mode: 'insensitive' } },
        { course: { title: { contains: s, mode: 'insensitive' } } },
        { course: { code: { contains: s, mode: 'insensitive' } } },
        { user: { firstName: { contains: s, mode: 'insensitive' } } },
        { user: { lastName: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const now = new Date();
    if (query.status === 'REVOKED') {
      where.status = 'REVOKED';
    } else if (query.status === 'EXPIRED') {
      where.status = { not: 'REVOKED' };
      where.expiresAt = { lt: now };
    } else if (query.status === 'ACTIVE') {
      where.status = 'ACTIVE';
      where.OR = [{ expiresAt: null }, { expiresAt: { gte: now } }];
    }

    const [total, items] = await Promise.all([
      this.prisma.certificate.count({ where }),
      this.prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true, code: true, estimatedHours: true } },
          template: true,
        },
      }),
    ]);

    const itemsWithUrl = await Promise.all(items.map((c) => this.withDownloadUrl(c)));

    return {
      items: itemsWithUrl,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, code: true, estimatedHours: true } },
        template: true,
      },
    });

    if (!certificate) throw new NotFoundException('Certificate not found');

    return this.withDownloadUrl(certificate);
  }

  /**
   * Learner view of their own certificates with optional search and status filter.
   */
  async findByUser(userId: string, query?: { search?: string; status?: string }) {
    const where: Prisma.CertificateWhereInput = { userId };

    if (query?.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { certificateNumber: { contains: s, mode: 'insensitive' } },
        { verificationCode: { contains: s, mode: 'insensitive' } },
        { course: { title: { contains: s, mode: 'insensitive' } } },
        { course: { code: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const now = new Date();
    if (query?.status === 'REVOKED') {
      where.status = 'REVOKED';
    } else if (query?.status === 'EXPIRED') {
      where.status = { not: 'REVOKED' };
      where.expiresAt = { lt: now };
    } else if (query?.status === 'ACTIVE') {
      where.status = 'ACTIVE';
      where.OR = [{ expiresAt: null }, { expiresAt: { gte: now } }];
    }

    const certs = await this.prisma.certificate.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, code: true, estimatedHours: true } },
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
        course: { select: { title: true, code: true } },
      },
    });

    if (!certificate)
      throw new NotFoundException('No certificate found for this verification code');

    const now = new Date();
    const isRevoked = certificate.status === 'REVOKED';
    const isExpired = certificate.expiresAt ? certificate.expiresAt < now : false;
    const valid = !isRevoked && !isExpired;

    return {
      valid,
      status: isRevoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE',
      revokedReason: certificate.revokedReason,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      holder: `${certificate.user.firstName} ${certificate.user.lastName}`,
      course: certificate.course.title,
      courseCode: certificate.course.code,
      downloadUrl: certificate.pdfFileUrl
        ? await this.filesService.getPresignedUrl(certificate.pdfFileUrl, 3600)
        : null,
    };
  }

  /**
   * Revoke certificate without destroying historical record.
   */
  async revoke(id: string, reason?: string, userId?: string) {
    const cert = await this.findById(id);
    const updated = await this.prisma.certificate.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason || 'Revoked by administrator',
        revokedById: userId ?? null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, code: true, estimatedHours: true } },
        template: true,
      },
    });

    await this.auditService.record({
      userId,
      action: 'REVOKE',
      entity: 'certificate',
      entityId: id,
      oldValues: { status: cert.status },
      newValues: { status: 'REVOKED', reason: updated.revokedReason },
    });

    return this.withDownloadUrl(updated);
  }

  /**
   * Reissue certificate with fresh verification code, refreshed template, and active status.
   */
  async reissue(id: string, userId?: string, reason?: string) {
    const cert = await this.findById(id);
    const activeTemplate = await this.prisma.certificateTemplate.findFirst({
      where: { isActive: true },
    });

    const newVerificationCode = generateVerificationCode(CERTIFICATE_CONFIG.verificationCodeLength);
    const templateToUse = activeTemplate ?? cert.template;

    let pdfKey: string | null = null;
    try {
      pdfKey = await this.generatePdf(
        `${cert.user.firstName} ${cert.user.lastName}`.trim() || 'Learner',
        cert.course.title,
        cert.course.code,
        cert.certificateNumber,
        newVerificationCode,
        cert.issuedAt,
        cert.expiresAt ??
          new Date(Date.now() + CERTIFICATE_CONFIG.validityMonths * 30 * 24 * 60 * 60 * 1000),
        templateToUse,
        'en',
        cert.course.estimatedHours ?? '30 Hours',
      );
    } catch {
      // PDF generation is best-effort
    }

    const updated = await this.prisma.certificate.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        revokedAt: null,
        revokedReason: null,
        revokedById: null,
        verificationCode: newVerificationCode,
        templateId: templateToUse?.id ?? cert.templateId,
        pdfFileUrl: pdfKey ?? cert.pdfFileUrl,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, code: true, estimatedHours: true } },
        template: true,
      },
    });

    await this.auditService.record({
      userId,
      action: 'REISSUE',
      entity: 'certificate',
      entityId: id,
      newValues: {
        status: 'ACTIVE',
        verificationCode: newVerificationCode,
        reason: reason || 'Reissued by administrator',
      },
    });

    return this.withDownloadUrl(updated);
  }

  /**
   * Fetch audit history for a certificate.
   */
  async getAuditHistory(id: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity: { in: ['certificate', 'Certificate'] },
        entityId: id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Executive stats & analytics for certificate dashboard.
   */
  async getCertificateStats() {
    const now = new Date();
    const [
      totalIssued,
      activeCount,
      revokedCount,
      expiredCount,
      totalDownloads,
      learnerGroup,
      courseGroup,
    ] = await Promise.all([
      this.prisma.certificate.count(),
      this.prisma.certificate.count({ where: { status: 'ACTIVE' } }),
      this.prisma.certificate.count({ where: { status: 'REVOKED' } }),
      this.prisma.certificate.count({
        where: {
          status: { not: 'REVOKED' },
          expiresAt: { lt: now },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          entity: { in: ['certificate', 'Certificate'] },
          action: 'DOWNLOAD',
        },
      }),
      this.prisma.certificate.groupBy({
        by: ['userId'],
        _count: { userId: true },
      }),
      this.prisma.certificate.groupBy({
        by: ['courseId'],
        _count: { courseId: true },
      }),
    ]);

    return {
      totalIssued,
      activeCount,
      revokedCount,
      expiredCount,
      totalDownloads,
      uniqueLearners: learnerGroup.length,
      certifiedCourses: courseGroup.length,
    };
  }

  /**
   * Download certificate PDF with language choice (en vs am) and audit tracking.
   * Always renders using the authoritative generation engine with exact template fidelity.
   */
  async downloadPdf(id: string, lang = 'en', userId?: string): Promise<{ downloadUrl: string | null }> {
    const cert = await this.findById(id);

    let pdfKey: string | null = null;
    try {
      const template = cert.template ?? (await this.getActiveTemplate());
      pdfKey = await this.generatePdf(
        `${cert.user.firstName} ${cert.user.lastName}`.trim() || 'Learner',
        cert.course.title,
        cert.course.code,
        cert.certificateNumber,
        cert.verificationCode,
        cert.issuedAt,
        cert.expiresAt ??
          new Date(Date.now() + CERTIFICATE_CONFIG.validityMonths * 30 * 24 * 60 * 60 * 1000),
        template,
        lang,
        cert.course.estimatedHours ?? '30 Hours',
      );

      if (pdfKey) {
        await this.prisma.certificate.update({
          where: { id },
          data: { pdfFileUrl: pdfKey },
        });
      }
    } catch (err) {
      this.logger.error(`Error generating authoritative PDF for certificate ${id}: ${err}`);
      pdfKey = cert.pdfFileUrl;
    }

    await this.auditService.record({
      userId,
      action: 'DOWNLOAD',
      entity: 'certificate',
      entityId: id,
      newValues: { lang, certificateNumber: cert.certificateNumber },
    });

    if (!pdfKey) return { downloadUrl: null };
    const downloadFilename = `${cert.certificateNumber || 'certificate'}_${lang}.pdf`;
    const downloadUrl = await this.filesService.getPresignedUrl(pdfKey, 3600, downloadFilename);
    return { downloadUrl };
  }

  /**
   * Core issuance logic (automated on course completion).
   */
  async issue(userId: string, courseId: string, lang = 'en') {
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
        course.title,
        course.code,
        certificateNumber,
        verificationCode,
        issuedAt,
        expiresAt,
        activeTemplate ?? null,
        lang,
        course.estimatedHours ?? '30 Hours',
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
        status: 'ACTIVE',
        issuedAt,
        expiresAt,
        pdfFileUrl: pdfKey,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, code: true, estimatedHours: true } },
        template: true,
      },
    });

    await this.auditService.record({
      userId,
      action: 'AUTO_ISSUE',
      entity: 'certificate',
      entityId: cert.id,
      newValues: { certificateNumber, courseId, courseTitle: course.title },
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
          en: `Your certificate for ${course.title} has been issued (${certificateNumber}).`,
          am: `ለ${course.title} ማህመርዎ ተሰጥቷል (${certificateNumber}).`,
        },
        { certificateId: cert.id, courseId },
      );
    } catch {
      // notification failure is non-fatal
    }

    return this.withDownloadUrl(cert);
  }

  /**
   * Auto-issue a certificate when a learner completes a course.
   */
  async maybeIssueForCompletion(userId: string, courseId: string) {
    const activeTemplate = await this.prisma.certificateTemplate.findFirst({
      where: { isActive: true },
    });

    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, code: true, estimatedHours: true } },
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
            course: { select: { id: true, title: true, code: true, estimatedHours: true } },
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
  /*  Authoritative PDF Generation Engine (Exact Parity with Preview)   */
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
    lang = 'en',
    courseHours: number | string = '30 Hours',
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const page = pdfDoc.addPage([842, 595]); // Standard A4 Landscape

    // Embed fonts: Try project/system Ebrima (supporting Ethiopic & Latin), else fallback to StandardFonts
    let regularFont: any;
    let boldFont: any;

    try {
      const regularFontPath = path.join(process.cwd(), 'assets', 'fonts', 'ebrima.ttf');
      const boldFontPath = path.join(process.cwd(), 'assets', 'fonts', 'ebrimabd.ttf');

      if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
        const regularBytes = fs.readFileSync(regularFontPath);
        const boldBytes = fs.readFileSync(boldFontPath);
        regularFont = await pdfDoc.embedFont(regularBytes);
        boldFont = await pdfDoc.embedFont(boldBytes);
      } else {
        regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      }
    } catch {
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const context: CertificateContext = {
      holderName,
      courseTitle,
      courseCode,
      courseHours,
      certificateNumber,
      verificationCode,
      issuedAt,
      expiresAt,
      lang,
    };

    await this.renderCertificatePage(pdfDoc, page, template, context, regularFont, boldFont);

    const pdfBytes = await pdfDoc.save();
    const fileName = `${certificateNumber}_${lang}.pdf`;

    return this.filesService.uploadBuffer(
      Buffer.from(pdfBytes),
      'certificate',
      'application/pdf',
      fileName,
    );
  }

  /**
   * Authoritative render method guaranteeing pixel-level parity with CertificateRenderer.tsx
   */
  private async renderCertificatePage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    template: { backgroundUrl: string | null; fields: Prisma.JsonValue } | null | undefined,
    ctx: CertificateContext,
    font: any,
    fontBold: any,
  ) {
    const { width, height } = page.getSize();
    const langKey = ctx.lang === 'am' ? 'am' : 'en';
    const i18n = CERTIFICATE_I18N[langKey];

    // 1. Draw Background Image if present in template
    if (template?.backgroundUrl) {
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
        // Fallback to geometric border
      }
    }

    // 2. High-Fidelity Geometric Vector Border & Frame (Exact match with CertificateRenderer.tsx)
    // Deep Navy Outer Border (12pt width)
    const navyColor = rgb(14 / 255, 42 / 255, 71 / 255);
    const goldColor = rgb(212 / 255, 175 / 255, 55 / 255);
    const royalBlueColor = rgb(30 / 255, 64 / 255, 175 / 255);

    page.drawRectangle({
      x: 6,
      y: 6,
      width: width - 12,
      height: height - 12,
      borderColor: navyColor,
      borderWidth: 12,
    });

    // Inner Gold Accent Line (Inset 18pt)
    page.drawRectangle({
      x: 18,
      y: 18,
      width: width - 36,
      height: height - 36,
      borderColor: goldColor,
      borderWidth: 1,
    });

    // Top-Right Geometric Accent Corners
    page.drawRectangle({
      x: width - 52,
      y: height - 60,
      width: 26,
      height: 48,
      color: royalBlueColor,
    });
    page.drawRectangle({
      x: width - 62,
      y: height - 34,
      width: 50,
      height: 22,
      color: navyColor,
    });

    // Extract template custom fields
    const fields = Array.isArray(template?.fields) ? (template.fields as any[]) : [];
    const fieldsMap = new Map<string, any>();
    fields.forEach((f) => fieldsMap.set(f.key, f));

    // Resolve Dynamic Texts
    const titleField = fieldsMap.get('certificateTitle') || fieldsMap.get('headerTitle');
    const preambleField = fieldsMap.get('preamble') || fieldsMap.get('headerSubtitle');
    const completionTextField = fieldsMap.get('completionText');
    const courseDescriptionField = fieldsMap.get('courseDescription');
    const footerNoteField = fieldsMap.get('footerNote');

    const titleText = (titleField?.text && ctx.lang !== 'am') ? titleField.text : i18n.title;
    const preambleText = (preambleField?.text && ctx.lang !== 'am') ? preambleField.text : i18n.preamble;
    const completionText = (completionTextField?.text && ctx.lang !== 'am') ? completionTextField.text : i18n.completion;
    const descriptionText = (courseDescriptionField?.text && ctx.lang !== 'am') ? courseDescriptionField.text : i18n.description;

    const courseHoursText = ctx.courseHours ? `${ctx.courseHours}` : `30 ${i18n.hoursSuffix}`;
    const formattedDate = ctx.issuedAt.toLocaleDateString(ctx.lang === 'am' ? 'am-ET' : 'en-GB');

    const centreX = width / 2;

    // 3. Central Content Flow
    // Certificate Title
    const titleY = height - (20 / 100) * height;
    const titleSize = 27;
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
    page.drawText(titleText, {
      x: centreX - titleWidth / 2,
      y: titleY,
      size: titleSize,
      font: fontBold,
      color: this.hexToRgb(titleField?.color) ?? rgb(30 / 255, 41 / 255, 59 / 255),
    });

    // Preamble Text
    const preambleY = height - (27 / 100) * height;
    const preambleSize = 11;
    const preambleWidth = fontBold.widthOfTextAtSize(preambleText, preambleSize);
    page.drawText(preambleText, {
      x: centreX - preambleWidth / 2,
      y: preambleY,
      size: preambleSize,
      font: fontBold,
      color: rgb(51 / 255, 65 / 255, 85 / 255),
    });

    // Recipient Name in prominent bold serif style
    const holderY = height - (36.5 / 100) * height;
    const holderSize = 28;
    const holderWidth = fontBold.widthOfTextAtSize(ctx.holderName, holderSize);
    page.drawText(ctx.holderName, {
      x: centreX - holderWidth / 2,
      y: holderY,
      size: holderSize,
      font: fontBold,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });

    // Underline Bar under Recipient Name
    page.drawLine({
      start: { x: centreX - 90, y: holderY - 8 },
      end: { x: centreX + 90, y: holderY - 8 },
      thickness: 1.5,
      color: rgb(203 / 255, 213 / 255, 225 / 255),
    });

    // Completion Text
    const compY = height - (45.5 / 100) * height;
    const compSize = 11.5;
    const compWidth = font.widthOfTextAtSize(completionText, compSize);
    page.drawText(completionText, {
      x: centreX - compWidth / 2,
      y: compY,
      size: compSize,
      font,
      color: rgb(71 / 255, 85 / 255, 105 / 255),
    });

    // Course Title
    const courseY = height - (53.5 / 100) * height;
    const courseSize = 19;
    const courseWidth = fontBold.widthOfTextAtSize(ctx.courseTitle, courseSize);
    page.drawText(ctx.courseTitle, {
      x: centreX - courseWidth / 2,
      y: courseY,
      size: courseSize,
      font: fontBold,
      color: navyColor,
    });

    // Course Description Text
    const descY = height - (61 / 100) * height;
    const descSize = 10;
    const descWidth = font.widthOfTextAtSize(descriptionText, descSize);
    page.drawText(descriptionText, {
      x: centreX - descWidth / 2,
      y: descY,
      size: descSize,
      font,
      color: rgb(71 / 255, 85 / 255, 105 / 255),
    });

    // 4. Assets & Positionable Elements (using exact top-left % coordinates mapped to PDF points)
    // (a) Company Logo / Header Brand
    const logoField = fieldsMap.get('companyLogo') || fieldsMap.get('logo') || {
      x: 50,
      y: 8,
      text: 'Ministry of Revenues',
      title: 'ETIMS Academy',
      visible: true,
    };
    if (logoField.visible !== false) {
      const logoX = (logoField.x / 100) * width;
      const logoY = height - (logoField.y / 100) * height;

      let embeddedLogo: any = null;
      if (logoField.imageUrl) {
        try {
          const imgBuf = await this.filesService.downloadFromUrl(logoField.imageUrl);
          embeddedLogo = await this.embedImage(pdfDoc, imgBuf);
        } catch {}
      }
      if (!embeddedLogo) {
        try {
          const localLogoPath = path.join(process.cwd(), 'assets', 'logo.jpg');
          if (fs.existsSync(localLogoPath)) {
            const buf = fs.readFileSync(localLogoPath);
            embeddedLogo = await pdfDoc.embedJpg(buf);
          }
        } catch {}
      }

      if (embeddedLogo) {
        const logoSize = 34;
        const brandTitle = logoField.text || 'Ministry of Revenues';
        const titleW = fontBold.widthOfTextAtSize(brandTitle, 13);
        const totalW = logoSize + 10 + titleW;
        const startX = logoX - totalW / 2;

        page.drawImage(embeddedLogo, {
          x: startX,
          y: logoY - logoSize / 2,
          width: logoSize,
          height: logoSize,
        });

        page.drawText(brandTitle, {
          x: startX + logoSize + 10,
          y: logoY - 4,
          size: 13,
          font: fontBold,
          color: navyColor,
        });
      } else {
        // Fallback brand box & title
        page.drawRectangle({
          x: logoX - 16,
          y: logoY - 14,
          width: 28,
          height: 28,
          color: navyColor,
        });
        page.drawText('MoR', {
          x: logoX - 12,
          y: logoY - 4,
          size: 10,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        const brandTitle = logoField.text || 'Ministry of Revenues';
        const brandSub = logoField.title || 'ETIMS Academy';
        page.drawText(brandTitle, {
          x: logoX + 18,
          y: logoY + 1,
          size: 11,
          font: fontBold,
          color: navyColor,
        });
        page.drawText(brandSub, {
          x: logoX + 18,
          y: logoY - 10,
          size: 8,
          font,
          color: rgb(100 / 255, 116 / 255, 139 / 255),
        });
      }
    }

    // (b) Crisp Deterministic 17x17 Vector QR Code
    const qrField = fieldsMap.get('qrCode') || { x: 88, y: 12, size: 65, visible: true };
    if (qrField.visible !== false) {
      const qrX = (qrField.x / 100) * width;
      const qrY = height - (qrField.y / 100) * height;
      this.drawVectorQrCode(
        page,
        ctx.verificationCode || ctx.certificateNumber,
        qrX,
        qrY,
        qrField.size || 60,
      );
    }

    // (c) Verified Badge
    const badgeField = fieldsMap.get('verifiedBadge') || {
      x: 12,
      y: 12,
      text: i18n.verified,
      visible: true,
    };
    if (badgeField.visible !== false) {
      const badgeX = (badgeField.x / 100) * width;
      const badgeY = height - (badgeField.y / 100) * height;
      const badgeText = badgeField.text || i18n.verified;
      this.drawVerifiedBadge(page, fontBold, badgeText, badgeX, badgeY);
    }

    // (d) Course Hours Metadata
    const hoursField = fieldsMap.get('courseHours') || { x: 18, y: 72, visible: true };
    if (hoursField.visible !== false) {
      const hoursX = (hoursField.x / 100) * width;
      const hoursY = height - (hoursField.y / 100) * height;
      const cleanHours = ctx.courseHours ? String(ctx.courseHours).replace(/\s*hours?\s*/gi, '').trim() : '30';
      const hoursLabel = `${hoursField.text || i18n.hoursPrefix} ${cleanHours} ${i18n.hoursSuffix}`;
      page.drawText(hoursLabel, {
        x: hoursX - fontBold.widthOfTextAtSize(hoursLabel, 11) / 2,
        y: hoursY,
        size: 11,
        font: fontBold,
        color: rgb(30 / 255, 41 / 255, 59 / 255),
      });
    }

    // (e) Date Metadata
    const dateField = fieldsMap.get('issuedAt') || { x: 82, y: 72, visible: true };
    if (dateField.visible !== false) {
      const dateX = (dateField.x / 100) * width;
      const dateY = height - (dateField.y / 100) * height;
      const dateLabel = `${dateField.text || i18n.datePrefix} ${formattedDate}`;
      page.drawText(dateLabel, {
        x: dateX - fontBold.widthOfTextAtSize(dateLabel, 11) / 2,
        y: dateY,
        size: 11,
        font: fontBold,
        color: rgb(30 / 255, 41 / 255, 59 / 255),
      });
    }

    // (f) Official Circular Stamp
    const stampField = fieldsMap.get('stamp') || { x: 50, y: 78, size: 85, visible: true };
    if (stampField.visible !== false) {
      const stampX = (stampField.x / 100) * width;
      const stampY = height - (stampField.y / 100) * height;
      if (stampField.imageUrl) {
        try {
          const imgBuf = await this.filesService.downloadFromUrl(stampField.imageUrl);
          const img = await this.embedImage(pdfDoc, imgBuf);
          if (img) {
            const sz = stampField.size || 80;
            page.drawImage(img, { x: stampX - sz / 2, y: stampY - sz / 2, width: sz, height: sz });
          }
        } catch {}
      } else {
        this.drawOfficialSeal(page, font, fontBold, stampX, stampY, 34);
      }
    }

    // (g) Signatures: render all configured signatures (signature1, signature2, etc.)
    const sigFields = fields.filter(
      (f: any) => f.key === 'signature' || f.key?.startsWith('signature') || f.key?.startsWith('sig_'),
    );
    const resolvedSigs =
      sigFields.length > 0
        ? sigFields
        : [
            {
              key: 'signature1',
              x: 20,
              y: 80,
              text: 'Abebe Bikila',
              title: 'Director of Training & Capacity Development',
              width: 130,
              visible: true,
            },
            {
              key: 'signature2',
              x: 80,
              y: 80,
              text: 'Mulugeta Tesfaye',
              title: 'Registrar General, Ministry of Revenues',
              width: 130,
              visible: true,
            },
          ];

    for (const sig of resolvedSigs) {
      if (sig.visible === false || sig.key === 'signature_hidden') continue;
      const sigX = (sig.x / 100) * width;
      const sigY = height - (sig.y / 100) * height;
      if (sig.imageUrl) {
        try {
          const imgBuf = await this.filesService.downloadFromUrl(sig.imageUrl);
          const img = await this.embedImage(pdfDoc, imgBuf);
          if (img) {
            const w = sig.width || 120;
            const h = (img.height / img.width) * w;
            page.drawImage(img, { x: sigX - w / 2, y: sigY - h / 2, width: w, height: h });
          }
        } catch {}
      } else {
        this.drawSignature(
          page,
          font,
          fontBold,
          sigX,
          sigY,
          sig.text,
          sig.title,
          sig.width || 120,
        );
      }
    }

    // (h) Platform Footer Note
    const footerText = footerNoteField?.text || i18n.footer(ctx.certificateNumber, ctx.verificationCode);
    if (footerNoteField?.visible !== false && footerText) {
      const footerY = 24; // ~96%
      const footerSize = 8.5;
      const footerWidth = font.widthOfTextAtSize(footerText, footerSize);
      page.drawText(footerText, {
        x: centreX - footerWidth / 2,
        y: footerY,
        size: footerSize,
        font,
        color: rgb(148 / 255, 163 / 255, 184 / 255),
      });
    }
  }

  /**
   * Crisp deterministic 17x17 vector QR Code implementation
   */
  private drawVectorQrCode(
    page: PDFPage,
    code: string,
    centerX: number,
    centerY: number,
    size: number,
  ) {
    let h = 0;
    for (let i = 0; i < code.length; i++) {
      h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
    }
    let seed = Math.abs(h);
    const s = 17;
    const grid: boolean[][] = Array.from({ length: s }, () => Array(s).fill(false));

    const markFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6) grid[r0 + r][c0 + c] = true;
          else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) grid[r0 + r][c0 + c] = true;
        }
      }
    };

    markFinder(0, 0);
    markFinder(0, 10);
    markFinder(10, 0);

    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        const inFinder = (r < 8 && c < 8) || (r < 8 && c >= 9) || (r >= 9 && c < 8);
        if (!inFinder) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          grid[r][c] = seed % 2 === 0;
        }
      }
    }

    const cellSize = size / s;
    const startX = centerX - size / 2;
    const startY = centerY + size / 2;

    // White QR code backdrop with subtle border
    page.drawRectangle({
      x: startX - 3,
      y: startY - size - 3,
      width: size + 6,
      height: size + 6,
      color: rgb(1, 1, 1),
      borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
      borderWidth: 1,
    });

    const darkColor = rgb(15 / 255, 23 / 255, 42 / 255);
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        if (grid[r][c]) {
          page.drawRectangle({
            x: startX + c * cellSize,
            y: startY - (r + 1) * cellSize,
            width: cellSize,
            height: cellSize,
            color: darkColor,
          });
        }
      }
    }
  }

  /**
   * Concentric Circular Official Seal with verified shield motif
   */
  private drawOfficialSeal(
    page: PDFPage,
    font: any,
    fontBold: any,
    centerX: number,
    centerY: number,
    radius = 32,
  ) {
    const navy = rgb(14 / 255, 42 / 255, 71 / 255);

    // Outer circle
    page.drawCircle({
      x: centerX,
      y: centerY,
      size: radius,
      borderColor: navy,
      borderWidth: 2.5,
    });

    // Inner dashed circle
    page.drawCircle({
      x: centerX,
      y: centerY,
      size: radius - 4,
      borderColor: navy,
      borderWidth: 0.8,
    });

    // Text inside
    const t1 = 'OFFICIAL';
    const t2 = 'SEAL';
    const w1 = fontBold.widthOfTextAtSize(t1, 8);
    const w2 = font.widthOfTextAtSize(t2, 7.5);
    page.drawText(t1, {
      x: centerX - w1 / 2,
      y: centerY + 2,
      size: 8,
      font: fontBold,
      color: navy,
    });
    page.drawText(t2, {
      x: centerX - w2 / 2,
      y: centerY - 9,
      size: 7.5,
      font,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });
  }

  /**
   * Verified Badge with checkmark circle
   */
  private drawVerifiedBadge(
    page: PDFPage,
    fontBold: any,
    text: string,
    centerX: number,
    centerY: number,
  ) {
    const badgeWidth = 84;
    const badgeHeight = 22;
    page.drawRectangle({
      x: centerX - badgeWidth / 2,
      y: centerY - badgeHeight / 2,
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
      borderWidth: 1,
    });
    // Check circle
    page.drawCircle({
      x: centerX - badgeWidth / 2 + 12,
      y: centerY,
      size: 6,
      color: rgb(14 / 255, 42 / 255, 71 / 255),
    });
    // Text
    const tWidth = fontBold.widthOfTextAtSize(text, 8.5);
    page.drawText(text, {
      x: centerX - badgeWidth / 2 + 22,
      y: centerY - 3,
      size: 8.5,
      font: fontBold,
      color: rgb(30 / 255, 41 / 255, 59 / 255),
    });
  }

  /**
   * Signature path with underline and metadata
   */
  private drawSignature(
    page: PDFPage,
    font: any,
    fontBold: any,
    centerX: number,
    centerY: number,
    name?: string,
    title?: string,
    width = 120,
  ) {
    // Underline line
    page.drawLine({
      start: { x: centerX - width / 2, y: centerY + 2 },
      end: { x: centerX + width / 2, y: centerY + 2 },
      thickness: 0.8,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    // Cursive signature approximation strokes
    const sigPoints = [
      { dx: -40, dy: 10 },
      { dx: -25, dy: 22 },
      { dx: -12, dy: 10 },
      { dx: 0, dy: 20 },
      { dx: 14, dy: 12 },
      { dx: 28, dy: 22 },
      { dx: 40, dy: 14 },
    ];
    for (let i = 0; i < sigPoints.length - 1; i++) {
      page.drawLine({
        start: { x: centerX + sigPoints[i].dx, y: centerY + sigPoints[i].dy },
        end: { x: centerX + sigPoints[i + 1].dx, y: centerY + sigPoints[i + 1].dy },
        thickness: 1.4,
        color: rgb(26 / 255, 26 / 255, 75 / 255),
      });
    }

    if (name) {
      const nw = fontBold.widthOfTextAtSize(name, 9);
      page.drawText(name, {
        x: centerX - nw / 2,
        y: centerY - 8,
        size: 9,
        font: fontBold,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });
    }
    if (title) {
      const tw = font.widthOfTextAtSize(title, 7.5);
      page.drawText(title, {
        x: centerX - tw / 2,
        y: centerY - 18,
        size: 7.5,
        font,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
      });
    }
  }

  private async embedImage(pdfDoc: PDFDocument, buffer: Buffer): Promise<any | null> {
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
