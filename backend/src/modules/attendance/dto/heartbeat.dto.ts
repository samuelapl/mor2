import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class HeartbeatDto {
  @ApiPropertyOptional({ example: 15, description: 'Seconds elapsed since last heartbeat' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  activeSeconds?: number;
}
