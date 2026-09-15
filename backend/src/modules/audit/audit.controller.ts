import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RoleName } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '@common/decorators';
import { PaginationQuery } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.SYSTEM_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (system admin only)' })
  async findAll(
    @Query()
    query: PaginationQuery & {
      action?: string;
      entity?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
  ) {
    return this.auditService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Audit log statistics (counts by action/entity)' })
  async stats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.auditService.stats({ from, to });
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportCsv(
    @Query()
    query: PaginationQuery & {
      action?: string;
      entity?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
    @Res() res: Response,
  ) {
    const csv = await this.auditService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiParam({ name: 'entity', type: String })
  @ApiParam({ name: 'entityId', type: String })
  async byEntity(@Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.auditService.findByEntity(entity, entityId);
  }
}
