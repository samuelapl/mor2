import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRegistrationDto {
  @ApiPropertyOptional({ example: 'Duplicate account' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}