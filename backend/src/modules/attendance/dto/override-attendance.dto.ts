import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class OverrideAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}
