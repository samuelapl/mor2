import { ApiPropertyOptional } from '@nestjs/swagger';
import { LawStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateLegalDocumentDto {
  @ApiPropertyOptional({ description: 'Category ID the document belongs to' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Document official number, e.g. 33/1984 or 979/2016' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'English title' })
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional({ description: 'Amharic title' })
  @IsOptional()
  @IsString()
  titleAm?: string;

  @ApiPropertyOptional({ description: 'English summary or description' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Amharic summary or description' })
  @IsOptional()
  @IsString()
  descriptionAm?: string;

  @ApiPropertyOptional({ enum: LawStatus })
  @IsOptional()
  @IsEnum(LawStatus)
  status?: LawStatus;

  @ApiPropertyOptional({ description: 'Year issued', example: 1984 })
  @IsOptional()
  @IsInt()
  yearIssued?: number;

  @ApiPropertyOptional({ description: 'Cover image URL / Negarit Gazeta preview image' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'PDF file URL' })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'Original file name' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  fileSize?: number;
}

