import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class NavItemConfigDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  labelEn: string;

  @ApiProperty()
  @IsString()
  labelAm: string;

  @ApiProperty()
  @IsString()
  href: string;

  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  desktopOnly?: boolean;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class StatItemConfigDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty()
  @IsString()
  labelEn: string;

  @ApiProperty()
  @IsString()
  labelAm: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtextEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtextAm?: string;

  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class WorkflowStepConfigDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNumber()
  stepNumber: number;

  @ApiProperty()
  @IsString()
  titleEn: string;

  @ApiProperty()
  @IsString()
  titleAm: string;

  @ApiProperty()
  @IsString()
  descriptionEn: string;

  @ApiProperty()
  @IsString()
  descriptionAm: string;

  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class FaqItemConfigDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  questionEn: string;

  @ApiProperty()
  @IsString()
  questionAm: string;

  @ApiProperty()
  @IsString()
  answerEn: string;

  @ApiProperty()
  @IsString()
  answerAm: string;

  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class BrandingConfigDto {
  @ApiProperty()
  @IsString()
  systemNameEn: string;

  @ApiProperty()
  @IsString()
  systemNameAm: string;

  @ApiProperty()
  @IsString()
  subtitleEn: string;

  @ApiProperty()
  @IsString()
  subtitleAm: string;

  @ApiProperty()
  @IsString()
  logoUrl: string;

  @ApiProperty()
  @IsBoolean()
  showGovBadge: boolean;

  @ApiProperty()
  @IsBoolean()
  showTopBanner: boolean;

  @ApiProperty()
  @IsString()
  topBannerTextEn: string;

  @ApiProperty()
  @IsString()
  topBannerTextAm: string;
}

export class HeaderConfigDto {
  @ApiProperty({ type: [NavItemConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavItemConfigDto)
  navLinks: NavItemConfigDto[];

  @ApiProperty()
  @IsBoolean()
  showSignInButton: boolean;

  @ApiProperty()
  @IsBoolean()
  showGetStartedButton: boolean;
}

export class HeroConfigDto {
  @ApiProperty()
  @IsString()
  badgeTextEn: string;

  @ApiProperty()
  @IsString()
  badgeTextAm: string;

  @ApiProperty()
  @IsString()
  headlineEn: string;

  @ApiProperty()
  @IsString()
  headlineAm: string;

  @ApiProperty()
  @IsString()
  subtitleEn: string;

  @ApiProperty()
  @IsString()
  subtitleAm: string;

  @ApiProperty()
  @IsString()
  primaryButtonTextEn: string;

  @ApiProperty()
  @IsString()
  primaryButtonTextAm: string;

  @ApiProperty()
  @IsString()
  primaryButtonHref: string;

  @ApiProperty()
  @IsBoolean()
  showPrimaryButton: boolean;

  @ApiProperty()
  @IsString()
  secondaryButtonTextEn: string;

  @ApiProperty()
  @IsString()
  secondaryButtonTextAm: string;

  @ApiProperty()
  @IsString()
  secondaryButtonHref: string;

  @ApiProperty()
  @IsBoolean()
  showSecondaryButton: boolean;
}

export class WorkflowConfigDto {
  @ApiProperty()
  @IsString()
  sectionTitleEn: string;

  @ApiProperty()
  @IsString()
  sectionTitleAm: string;

  @ApiProperty()
  @IsString()
  sectionSubtitleEn: string;

  @ApiProperty()
  @IsString()
  sectionSubtitleAm: string;

  @ApiProperty({ type: [WorkflowStepConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepConfigDto)
  steps: WorkflowStepConfigDto[];
}

export class DesktopAppConfigDto {
  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty()
  @IsString()
  titleEn: string;

  @ApiProperty()
  @IsString()
  titleAm: string;

  @ApiProperty()
  @IsString()
  descriptionEn: string;

  @ApiProperty()
  @IsString()
  descriptionAm: string;

  @ApiProperty()
  @IsString()
  version: string;

  @ApiProperty()
  @IsString()
  downloadUrl: string;
}

export class ContactConfigDto {
  @ApiProperty()
  @IsString()
  headquartersEn: string;

  @ApiProperty()
  @IsString()
  headquartersAm: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  workingHoursEn: string;

  @ApiProperty()
  @IsString()
  workingHoursAm: string;
}

export class FooterConfigDto {
  @ApiProperty()
  @IsString()
  descriptionEn: string;

  @ApiProperty()
  @IsString()
  descriptionAm: string;

  @ApiProperty({ type: ContactConfigDto })
  @ValidateNested()
  @Type(() => ContactConfigDto)
  contact: ContactConfigDto;

  @ApiProperty({ type: [NavItemConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavItemConfigDto)
  links: NavItemConfigDto[];

  @ApiProperty()
  @IsString()
  copyrightEn: string;

  @ApiProperty()
  @IsString()
  copyrightAm: string;
}

export class UpdateLandingConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiProperty({ type: BrandingConfigDto })
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  branding: BrandingConfigDto;

  @ApiProperty({ type: HeaderConfigDto })
  @ValidateNested()
  @Type(() => HeaderConfigDto)
  header: HeaderConfigDto;

  @ApiProperty({ type: HeroConfigDto })
  @ValidateNested()
  @Type(() => HeroConfigDto)
  hero: HeroConfigDto;

  @ApiProperty({ type: [StatItemConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatItemConfigDto)
  stats: StatItemConfigDto[];

  @ApiProperty({ type: WorkflowConfigDto })
  @ValidateNested()
  @Type(() => WorkflowConfigDto)
  workflow: WorkflowConfigDto;

  @ApiProperty({ type: DesktopAppConfigDto })
  @ValidateNested()
  @Type(() => DesktopAppConfigDto)
  desktopApp: DesktopAppConfigDto;

  @ApiProperty({ type: [FaqItemConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemConfigDto)
  faqs: FaqItemConfigDto[];

  @ApiProperty({ type: FooterConfigDto })
  @ValidateNested()
  @Type(() => FooterConfigDto)
  footer: FooterConfigDto;
}

