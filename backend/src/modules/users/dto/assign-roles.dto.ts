import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RoleName } from '@prisma/client';

export class AssignRoleDto {
  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  @IsNotEmpty()
  role: RoleName;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}
