import { ApiPropertyOptional } from '@nestjs/swagger';
import { LawDomain, LawInstrumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryLawCategoryDto {
  @ApiPropertyOptional({ enum: LawDomain })
  @IsOptional()
  @IsEnum(LawDomain)
  domain?: LawDomain;

  @ApiPropertyOptional({ enum: LawInstrumentType })
  @IsOptional()
  @IsEnum(LawInstrumentType)
  instrumentType?: LawInstrumentType;

  @ApiPropertyOptional({ description: 'Filter by search term in category name' })
  @IsOptional()
  @IsString()
  search?: string;
}

