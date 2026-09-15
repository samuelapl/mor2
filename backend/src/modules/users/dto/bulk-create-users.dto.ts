import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { RoleName } from '@prisma/client';

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

  @ApiPropertyOptional({ example: 'Temporary123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ enum: RoleName, default: RoleName.LEARNER })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}

export class BulkCreateUsersDto {
  @ApiProperty({ type: [BulkCreateUserItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateUserItemDto)
  users: BulkCreateUserItemDto[];
}
