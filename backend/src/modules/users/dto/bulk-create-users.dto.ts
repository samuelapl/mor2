import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const BULK_CREATE_MAX_ROWS = 500;

export class BulkCreateUserItemDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@mor.gov.et' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+251911000000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    example: '0012345678',
    description: 'Taxpayer Identification Number (optional)',
  })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({ example: 'Temporary123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'LEARNER', default: 'LEARNER' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class BulkCreateUsersDto {
  @ApiProperty({ type: [BulkCreateUserItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_CREATE_MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateUserItemDto)
  users: BulkCreateUserItemDto[];
}
