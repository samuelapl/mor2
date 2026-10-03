import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus } from '@prisma/client';

export class ReviewCourseDto {
  @ApiProperty({ enum: ApprovalStatus, example: ApprovalStatus.APPROVED })
  @IsEnum(ApprovalStatus)
  status!: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Content meets all quality standards.' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ReturnToDraftDto {
  @ApiProperty({
    example: 'Please add the two online sessions agreed with the department.',
    description: 'Why the approval is withdrawn; sent to the course owners',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RequestApprovalDto {
  @ApiPropertyOptional({ description: 'Submit for approval as an updated version' })
  @IsOptional()
  versionNote?: string;
}
