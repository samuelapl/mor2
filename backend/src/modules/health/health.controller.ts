import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '@common/decorators';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'System health check (DB, MinIO, Redis)' })
  async health(): Promise<unknown> {
    return this.healthService.status();
  }

  @Get('public/landing-stats')
  @Public()
  @ApiOperation({ summary: 'Live platform counters shown on the public landing page' })
  async landingStats(): Promise<unknown> {
    return this.healthService.landingStats();
  }
}
