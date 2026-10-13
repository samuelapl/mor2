import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RoundSessionSlotDto {
  @ApiPropertyOptional({ example: 'plan-uuid-1' })
  @IsOptional()
  @IsString()
  sessionPlanId?: string;

  @ApiPropertyOptional({ example: 'Classroom Session 1: Practical VAT Lab' })
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional({ example: 'ክፍለ ጊዜ 1፡ የተግባር የቫት ልምምድ' })
  @IsOptional()
  @IsString()
  titleAm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectivesEn?: string;

  @ApiProperty({ example: '2026-10-15T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @ApiPropertyOptional({ example: 'trainer-uuid-1' })
  @IsOptional()
  @IsString()
  trainerId?: string;
}

export class ScheduleInPersonRoundDto {
  @ApiProperty({ example: 'course-uuid-1' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ example: 'venue-uuid-1' })
  @IsString()
  @IsNotEmpty()
  venueId!: string;

  @ApiPropertyOptional({ example: 'trainer-uuid-1' })
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Round number (auto-increments if omitted)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;

  @ApiProperty({ type: [RoundSessionSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundSessionSlotDto)
  sessions!: RoundSessionSlotDto[];
}

export class BranchRoundAllocationDto {
  @ApiProperty({ example: 'venue-uuid-1' })
  @IsString()
  @IsNotEmpty()
  venueId!: string;

  @ApiPropertyOptional({ example: 'trainer-uuid-1' })
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Explicit round number (auto-calculated per venue if omitted)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;

  @ApiProperty({ type: [RoundSessionSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundSessionSlotDto)
  sessions!: RoundSessionSlotDto[];
}

export class ScheduleMultiBranchRoundsDto {
  @ApiProperty({ example: 'course-uuid-1' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ type: [BranchRoundAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchRoundAllocationDto)
  branches!: BranchRoundAllocationDto[];
}


