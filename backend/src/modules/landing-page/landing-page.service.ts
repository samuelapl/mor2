import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { AuditService } from '@modules/audit/audit.service';
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  LandingPageConfig,
} from './default-config';
import { UpdateLandingConfigDto } from './dto/landing-config.dto';
import * as fs from 'fs';
import * as path from 'path';

const SETTING_KEY = 'landing_page_config';

@Injectable()
export class LandingPageService {
  private readonly logger = new Logger(LandingPageService.name);
  private memoryCache: LandingPageConfig | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getPublicConfig(): Promise<LandingPageConfig> {
    if (this.memoryCache) {
      return this.memoryCache;
    }
    return this.loadAndCacheConfig();
  }

  async getAdminConfig(): Promise<LandingPageConfig> {
    return this.loadAndCacheConfig();
  }

  async updateConfig(
    dto: UpdateLandingConfigDto,
    userId?: string,
  ): Promise<LandingPageConfig> {
    const previous = await this.getAdminConfig();
    const version = (previous.version || 1) + 1;
    const merged: LandingPageConfig = {
      ...DEFAULT_LANDING_PAGE_CONFIG,
      ...dto,
      version,
      branding: {
        ...DEFAULT_LANDING_PAGE_CONFIG.branding,
        ...(dto.branding || {}),
      },
      header: {
        ...DEFAULT_LANDING_PAGE_CONFIG.header,
        ...(dto.header || {}),
        navLinks: dto.header?.navLinks ?? DEFAULT_LANDING_PAGE_CONFIG.header.navLinks,
      },
      hero: {
        ...DEFAULT_LANDING_PAGE_CONFIG.hero,
        ...(dto.hero || {}),
      },
      stats: dto.stats ?? DEFAULT_LANDING_PAGE_CONFIG.stats,
      workflow: {
        ...DEFAULT_LANDING_PAGE_CONFIG.workflow,
        ...(dto.workflow || {}),
        steps: dto.workflow?.steps ?? DEFAULT_LANDING_PAGE_CONFIG.workflow.steps,
      },
      desktopApp: {
        ...DEFAULT_LANDING_PAGE_CONFIG.desktopApp,
        ...(dto.desktopApp || {}),
      },
      faqs: dto.faqs ?? DEFAULT_LANDING_PAGE_CONFIG.faqs,
      footer: {
        ...DEFAULT_LANDING_PAGE_CONFIG.footer,
        ...(dto.footer || {}),
        contact: {
          ...DEFAULT_LANDING_PAGE_CONFIG.footer.contact,
          ...(dto.footer?.contact || {}),
        },
        links: dto.footer?.links ?? DEFAULT_LANDING_PAGE_CONFIG.footer.links,
      },
    };

    const jsonValue = JSON.stringify(merged);

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: jsonValue,
        description: 'Dynamic configuration for the public landing page, header, and footer',
      },
      update: {
        value: jsonValue,
        description: 'Dynamic configuration for the public landing page, header, and footer',
      },
    });

    this.memoryCache = merged;

    try {
      await this.auditService.record({
        userId,
        action: 'UPDATE',
        entity: 'landing_page_config',
        oldValues: previous as unknown as Record<string, unknown>,
        newValues: merged as unknown as Record<string, unknown>,
      });
    } catch (err) {
      this.logger.warn(`Failed to record audit log for landing page update: ${err}`);
    }

    return merged;
  }

  async resetToDefaults(userId?: string): Promise<LandingPageConfig> {
    const previous = await this.getAdminConfig();
    const defaultConfig = { ...DEFAULT_LANDING_PAGE_CONFIG, version: (previous.version || 1) + 1 };
    const jsonValue = JSON.stringify(defaultConfig);

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: jsonValue,
        description: 'Dynamic configuration for the public landing page, header, and footer',
      },
      update: {
        value: jsonValue,
        description: 'Dynamic configuration for the public landing page, header, and footer',
      },
    });

    this.memoryCache = defaultConfig;

    try {
      await this.auditService.record({
        userId,
        action: 'RESET',
        entity: 'landing_page_config',
        oldValues: previous as unknown as Record<string, unknown>,
        newValues: defaultConfig as unknown as Record<string, unknown>,
      });
    } catch (err) {
      this.logger.warn(`Failed to record audit log for landing page reset: ${err}`);
    }

    return defaultConfig;
  }

  async saveLogoFile(file: Express.Multer.File, userId?: string): Promise<{ logoUrl: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Image file is required');
    }

    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file format. Allowed: PNG, JPEG, WEBP, SVG. Received: ${file.mimetype}`,
      );
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      throw new BadRequestException('Logo file exceeds maximum size limit of 2MB');
    }

    const publicDir = path.join(process.cwd(), 'public');
    const uploadDir = path.join(publicDir, 'uploads', 'branding');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'png';
    const filename = `logo-${Date.now()}.${ext}`;
    const destinationPath = path.join(uploadDir, filename);

    fs.writeFileSync(destinationPath, file.buffer);

    const logoUrl = `/uploads/branding/${filename}`;

    // Update existing config with new logoUrl
    const currentConfig = await this.getAdminConfig();
    const updatedBranding = {
      ...currentConfig.branding,
      logoUrl,
    };

    await this.updateConfig(
      {
        ...currentConfig,
        branding: updatedBranding,
      },
      userId,
    );

    return { logoUrl };
  }

  private async loadAndCacheConfig(): Promise<LandingPageConfig> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });

      if (!setting || !setting.value) {
        this.memoryCache = DEFAULT_LANDING_PAGE_CONFIG;
        return DEFAULT_LANDING_PAGE_CONFIG;
      }

      const parsed = JSON.parse(setting.value);
      const merged: LandingPageConfig = {
        ...DEFAULT_LANDING_PAGE_CONFIG,
        ...parsed,
        branding: {
          ...DEFAULT_LANDING_PAGE_CONFIG.branding,
          ...(parsed.branding || {}),
        },
        header: {
          ...DEFAULT_LANDING_PAGE_CONFIG.header,
          ...(parsed.header || {}),
          navLinks: parsed.header?.navLinks ?? DEFAULT_LANDING_PAGE_CONFIG.header.navLinks,
        },
        hero: {
          ...DEFAULT_LANDING_PAGE_CONFIG.hero,
          ...(parsed.hero || {}),
        },
        stats: parsed.stats ?? DEFAULT_LANDING_PAGE_CONFIG.stats,
        workflow: {
          ...DEFAULT_LANDING_PAGE_CONFIG.workflow,
          ...(parsed.workflow || {}),
          steps: parsed.workflow?.steps ?? DEFAULT_LANDING_PAGE_CONFIG.workflow.steps,
        },
        desktopApp: {
          ...DEFAULT_LANDING_PAGE_CONFIG.desktopApp,
          ...(parsed.desktopApp || {}),
        },
        faqs: parsed.faqs ?? DEFAULT_LANDING_PAGE_CONFIG.faqs,
        footer: {
          ...DEFAULT_LANDING_PAGE_CONFIG.footer,
          ...(parsed.footer || {}),
          contact: {
            ...DEFAULT_LANDING_PAGE_CONFIG.footer.contact,
            ...(parsed.footer?.contact || {}),
          },
          links: parsed.footer?.links ?? DEFAULT_LANDING_PAGE_CONFIG.footer.links,
        },
      };

      this.memoryCache = merged;
      return merged;
    } catch (err) {
      this.logger.error('Failed to load landing page config from database. Falling back to defaults.', err);
      this.memoryCache = DEFAULT_LANDING_PAGE_CONFIG;
      return DEFAULT_LANDING_PAGE_CONFIG;
    }
  }
}

