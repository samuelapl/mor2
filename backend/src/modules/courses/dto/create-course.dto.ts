import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDeliveryMode, CourseLevel } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'CS101' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ example: 'Computer Basics' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional({ example: 'An introductory course on computer basics.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Understand basic computer operations.' })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional({ example: 'Tax' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Revenue Audit' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'Tax Officers and Auditors' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ example: 'Online / Self-Paced' })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ enum: CourseDeliveryMode, example: CourseDeliveryMode.BOTH })
  @IsOptional()
  @IsEnum(CourseDeliveryMode)
  deliveryMode?: CourseDeliveryMode;

  @ApiPropertyOptional({ example: true, description: 'Course includes planned online sessions (Online Self-Paced only).' })
  @IsOptional()
  @IsBoolean()
  hasOnlineSessions?: boolean;

  @ApiPropertyOptional({ example: 'Basic knowledge of Ethiopian tax laws' })
  @IsOptional()
  @IsString()
  prerequisites?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

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
