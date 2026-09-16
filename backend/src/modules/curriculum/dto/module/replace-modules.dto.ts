import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateModuleDto } from './create-module.dto';

export class ReplaceModulesDto {
  @ApiProperty({
    type: [CreateModuleDto],
    description: 'Full replacement curriculum — existing modules/lessons are replaced',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuleDto)
  modules: CreateModuleDto[];
}
