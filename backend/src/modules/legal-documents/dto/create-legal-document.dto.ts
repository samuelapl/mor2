import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LawStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLegalDocumentDto {
  @ApiProperty({ description: 'Category ID the document belongs to' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Document official number, e.g. 33/1984 or 979/2016' })
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @ApiProperty({ description: 'English title' })
  @IsString()
  @IsNotEmpty()
  titleEn: string;

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

  @ApiPropertyOptional({ enum: LawStatus, default: LawStatus.IN_FORCE })
  @IsOptional()
  @IsEnum(LawStatus)
  status?: LawStatus;

  @ApiPropertyOptional({ description: 'Year issued (Gregorian or Ethiopian)', example: 1984 })
  @IsOptional()
  @IsInt()
  yearIssued?: number;

  @ApiPropertyOptional({ description: 'Cover image URL / Negarit Gazeta preview image' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ description: 'PDF file URL' })
  @IsString()
  @IsNotEmpty()
  pdfUrl: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  fileSize?: number;
}

