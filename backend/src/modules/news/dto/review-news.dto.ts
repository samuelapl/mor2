import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

export class ReviewNewsDto {
  @ApiProperty({ description: 'true publishes the post, false rejects it' })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({ description: 'Required when rejecting; shown to the author' })
  @ValidateIf((o: ReviewNewsDto) => o.approve === false || o.reason !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason?: string;
}
