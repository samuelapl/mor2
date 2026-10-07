import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LawDomain, LawInstrumentType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateLawCategoryDto {
  @ApiProperty({ enum: LawDomain, description: 'Domain: TAX_LAW, CUSTOMS_LAW, DRAFT_LAW, OTHER_DOCUMENTS' })
  @IsEnum(LawDomain)
  domain: LawDomain;

  @ApiProperty({ enum: LawInstrumentType, description: 'Instrument type: PROCLAMATION, REGULATION, DIRECTIVE, CIRCULAR, OTHER' })
  @IsEnum(LawInstrumentType)
  instrumentType: LawInstrumentType;

  @ApiProperty({ description: 'English category name, e.g. Sharing of Revenue Proclamation' })
  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @ApiPropertyOptional({ description: 'Amharic category name' })
  @IsOptional()
  @IsString()
  nameAm?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order sequence' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

