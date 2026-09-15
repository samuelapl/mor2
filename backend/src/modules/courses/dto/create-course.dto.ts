import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocalizedTextDto {
  @ApiProperty({ example: 'የኮምፒውተር ኮርስ' })
  @IsString()
  @MinLength(2)
  am: string;

  @ApiProperty({ example: 'Computer Basics' })
  @IsString()
  @MinLength(2)
  en: string;
}

export class CreateCourseDto {
  @ApiProperty({ example: 'CS101' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ enum: CourseLevel, example: CourseLevel.BASIC })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ example: ['user-uuid-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ownerIds?: string[];

  @ApiPropertyOptional({
    example: 'http://localhost:59000/eltms-files/covers/abc.png',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;
}
