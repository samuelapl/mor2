import { ApiPropertyOptional } from '@nestjs/swagger';
import { NewsCategory, NewsStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListNewsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Matches the headline' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: NewsCategory })
  @IsOptional()
  @IsEnum(NewsCategory)
  category?: NewsCategory;

  @ApiPropertyOptional({
    description: 'true: only featured posts; false: leave featured posts out',
  })
  @IsOptional()
  // Read the raw query string: implicit conversion would turn "false" into true.
  @Transform(({ obj, key }) => {
    const raw = obj[key];
    return raw === 'true' || raw === true ? true : raw === 'false' || raw === false ? false : raw;
  })
  @IsBoolean()
  featured?: boolean;
}

export class AdminListNewsQueryDto extends ListNewsQueryDto {
  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;
}

export class ListCommentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
