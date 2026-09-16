import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String], description: 'Full replace-set of permission IDs for the role' })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
