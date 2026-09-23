import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CertificateFieldDto {
  /** Placeholder key — one of holderName/courseTitle/courseCode/orgName/certificateNumber/verificationCode/issuedAt/expiresAt */
  @ApiProperty({ example: 'holderName' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ example: 'left' })
  @IsOptional()
  @IsString()
  align?: 'left' | 'center' | 'right';

  @ApiPropertyOptional({ example: 421 })
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ example: '#111111' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  bold?: boolean;

  @ApiPropertyOptional({ example: '/logo.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 'MD. Morshedul Alam ACMA' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: 'CEO, Analyst Skill' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class CreateCertificateTemplateDto {
  @ApiProperty({ example: 'MoR Standard Certificate' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Official certificate for ETIMS Academy courses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Background image URL (PNG/JPG uploaded via POST /files/certificate-template)',
  })
  @IsOptional()
  @IsString()
  backgroundUrl?: string;

  @ApiPropertyOptional({ type: [CertificateFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateFieldDto)
  fields?: CertificateFieldDto[];
}
