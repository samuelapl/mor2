import { ApiPropertyOptional } from '@nestjs/swagger';
import { LawDomain, LawInstrumentType, LawStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryLegalDocumentDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: LawDomain, description: 'Filter by law domain' })
  @IsOptional()
  @IsEnum(LawDomain)
  domain?: LawDomain;

  @ApiPropertyOptional({ enum: LawInstrumentType, description: 'Filter by instrument type' })
  @IsOptional()
  @IsEnum(LawInstrumentType)
  instrumentType?: LawInstrumentType;

  @ApiPropertyOptional({ enum: LawStatus, description: 'Filter by status: IN_FORCE, REPEALED, AMENDED, DRAFT' })
  @IsOptional()
  @IsEnum(LawStatus)
  status?: LawStatus;

  @ApiPropertyOptional({ description: 'Search keyword matching document number or titles' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by year issued' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  yearIssued?: number;
}

