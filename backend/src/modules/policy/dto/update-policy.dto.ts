import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePolicyDto {
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description:
      '% of durationMinutes required before completion (fractional values allowed, e.g. 0.3)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  timeSpentPercent?: number;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'Minutes to wait after exhausting attempts before a retake is allowed (0 = never)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  retakeCooldownMinutes?: number;
}
