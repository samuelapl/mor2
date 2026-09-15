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
}
