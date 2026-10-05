import { ApiProperty } from '@nestjs/swagger';
import { NewsReactionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { COMMENT_MAX_LENGTH } from '../news.constants';

export class ReactToNewsDto {
  @ApiProperty({
    enum: NewsReactionType,
    description: 'Sending the reaction you already have removes it',
  })
  @IsEnum(NewsReactionType)
  type!: NewsReactionType;
}

export class CreateNewsCommentDto {
  @ApiProperty({ maxLength: COMMENT_MAX_LENGTH, description: 'Plain text' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MAX_LENGTH)
  content!: string;
}

export class ModerateNewsCommentDto {
  @ApiProperty()
  @IsBoolean()
  isHidden!: boolean;
}
