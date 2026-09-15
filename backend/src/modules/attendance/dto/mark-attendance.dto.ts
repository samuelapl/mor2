import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class MarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Duration attended in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkMarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    type: [MarkAttendanceDto],
    description: 'Attendance records; userId + status are required per entry',
  })
  records: Array<{
    userId: string;
    status: AttendanceStatus;
    durationMinutes?: number;
    notes?: string;
  }>;
}
