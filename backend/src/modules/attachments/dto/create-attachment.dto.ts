import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttachmentDto {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty({ example: 'lesson-notes.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'attachments/abc123/lesson-notes.pdf' })
  @IsString()
  fileKey: string;

  @ApiProperty({ example: 'pdf' })
  @IsString()
  fileType: string;

  @ApiProperty({ example: 1048576 })
  sizeBytes: number;
}
