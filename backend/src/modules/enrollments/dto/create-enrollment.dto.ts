import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ example: 'course-uuid' })
  @IsString()
  @IsNotEmpty()
  courseId: string;
}

export class AdminEnrollDto extends CreateEnrollmentDto {
  @ApiProperty({ example: 'learner-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
