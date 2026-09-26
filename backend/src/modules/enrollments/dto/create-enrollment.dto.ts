import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CourseDeliveryMode } from '@prisma/client';

export class CreateEnrollmentDto {
  @ApiProperty({ example: 'course-uuid' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({ enum: CourseDeliveryMode, default: CourseDeliveryMode.ONLINE_ONLY })
  @IsOptional()
  @IsEnum(CourseDeliveryMode)
  deliveryMode?: CourseDeliveryMode;

  @ApiPropertyOptional({ example: 'venue-uuid' })
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional({ example: 'session-uuid' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class AdminEnrollDto extends CreateEnrollmentDto {
  @ApiProperty({ example: 'learner-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
