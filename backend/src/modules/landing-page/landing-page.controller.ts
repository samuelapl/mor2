import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, Permissions, Public } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { LandingPageService } from './landing-page.service';
import { UpdateLandingConfigDto } from './dto/landing-config.dto';

@ApiTags('landing-page')
@Controller()
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Public()
  @Get('public/landing-config')
  @ApiOperation({ summary: 'Get active landing page, header, and footer configuration (public)' })
  async getPublicConfig() {
    return this.landingPageService.getPublicConfig();
  }

  @ApiBearerAuth()
  @Permissions('landing_page.manage')
  @Get('admin/landing-config')
  @ApiOperation({ summary: 'Get full landing page configuration for admin CMS studio' })
  async getAdminConfig() {
    return this.landingPageService.getAdminConfig();
  }

  @ApiBearerAuth()
  @Permissions('landing_page.manage')
  @Put('admin/landing-config')
  @ApiOperation({ summary: 'Update landing page, navigation, and branding configuration' })
  async updateConfig(
    @Body() dto: UpdateLandingConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.landingPageService.updateConfig(dto, user?.id);
  }

  @ApiBearerAuth()
  @Permissions('landing_page.manage')
  @Post('admin/landing-config/logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload custom logo image for landing page branding' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Logo image (PNG, JPEG, WEBP, SVG)' },
      },
      required: ['file'],
    },
  })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.landingPageService.saveLogoFile(file, user?.id);
  }

  @ApiBearerAuth()
  @Permissions('landing_page.manage')
  @Post('admin/landing-config/reset')
  @ApiOperation({ summary: 'Reset landing page configuration to system factory defaults' })
  async resetToDefaults(@CurrentUser() user: AuthenticatedUser) {
    return this.landingPageService.resetToDefaults(user?.id);
  }
}

