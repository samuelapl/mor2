import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PolicyService } from './policy.service';
import { UpdatePolicyDto } from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('policy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  @Permissions('course_policy.manage')
  @ApiOperation({ summary: 'Get the current course policy settings (time-spent %, retake cooldown)' })
  async get() {
    return this.policyService.getSettings();
  }

  @Patch()
  @Permissions('course_policy.manage')
  @ApiOperation({ summary: 'Update the course policy settings' })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePolicyDto) {
    return this.policyService.updateSettings(dto, user.id);
  }
}
