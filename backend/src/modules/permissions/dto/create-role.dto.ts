import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'REGIONAL_COORDINATOR' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Regional Coordinator' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ example: 'Coordinates regional training programs.' })
  @IsOptional()
  @IsString()
  description?: string;
}
