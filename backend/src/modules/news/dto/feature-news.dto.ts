import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class FeatureNewsDto {
  @ApiProperty()
  @IsBoolean()
  isFeatured!: boolean;
}
