import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'MoR HQ - Computer Lab 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Main Building, 3rd Floor, Room 304' })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiProperty({ example: 'Addis Ababa Head Office' })
  @IsString()
  @IsNotEmpty()
  branch: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: ['Projector', '30 Desktop PCs', 'Ministry Intranet'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facilities?: string[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

