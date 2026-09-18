import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AddLessonTimeDto {
  @ApiProperty({
    example: 30,
    minimum: 1,
    maximum: 300,
    description: 'Seconds elapsed since the last heartbeat',
  })
  @IsInt()
  @Min(1)
  @Max(300)
  secondsDelta: number;
}
