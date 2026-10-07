import { ApiPropertyOptional } from '@nestjs/swagger';
import { LawDomain, LawInstrumentType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLawCategoryDto {
  @ApiPropertyOptional({ enum: LawDomain })
  @IsOptional()
  @IsEnum(LawDomain)
  domain?: LawDomain;

  @ApiPropertyOptional({ enum: LawInstrumentType })
  @IsOptional()
  @IsEnum(LawInstrumentType)
  instrumentType?: LawInstrumentType;

  @ApiPropertyOptional({ description: 'English category name' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Amharic category name' })
  @IsOptional()
  @IsString()
  nameAm?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order sequence' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

