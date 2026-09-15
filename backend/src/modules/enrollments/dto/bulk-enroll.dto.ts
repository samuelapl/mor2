import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkEnrollDto {
  @ApiProperty({ example: ['learner-uuid-1', 'learner-uuid-2'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];
}
