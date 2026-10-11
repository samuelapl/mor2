import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '@common/decorators';
import { APP_TIME_ZONE, APP_TIME_ZONE_LABEL } from '@common/utils';

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

  @Get('time')
  @Public()
  @ApiOperation({ summary: 'Server clock and the platform time zone (for "starts in" previews)' })
  time() {
    return { now: new Date().toISOString(), timeZone: APP_TIME_ZONE, label: APP_TIME_ZONE_LABEL };
  }

  @Get('public/landing-stats')
  @Public()
  @ApiOperation({ summary: 'Live platform counters shown on the public landing page' })
  async landingStats(): Promise<unknown> {
    return this.healthService.landingStats();
  }
}
