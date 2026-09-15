import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CheckInMethod } from '@prisma/client';

export class CheckInDto {
  @ApiPropertyOptional({ enum: CheckInMethod, default: CheckInMethod.VIRTUAL })
  @IsOptional()
  @IsEnum(CheckInMethod)
  method?: CheckInMethod;

  @ApiPropertyOptional({ description: 'Latitude (GPS check-in stub)' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude (GPS check-in stub)' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
