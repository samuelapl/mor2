import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateNewsDto {
  @ApiProperty({
    example: 'የገቢዎች ሚኒስቴር እና IBFD ውይይታቸውን አጠናቀቁ',
    description: 'Shown exactly as written (Amharic or English)',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  headline!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Card excerpt; generated from the content when empty',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  summary?: string | null;

  @ApiProperty({ description: 'Rich text (HTML); sanitized to an allow-list of tags' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content!: string;

  @ApiPropertyOptional({ enum: NewsCategory, default: NewsCategory.PRESS_RELEASE })
  @IsOptional()
  @IsEnum(NewsCategory)
  category?: NewsCategory;

  @ApiPropertyOptional({ example: 'የገቢዎች ሚኒስቴር' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-07-22' })
  @IsOptional()
  @IsDateString()
  eventDate?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}
