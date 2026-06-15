import { Controller, Get, Query } from '@nestjs/common';
import { MonitorService } from './monitor.service';

@Controller('assistant/monitor')
export class AssistantMonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('service-click-rank')
  getServiceClickRank(
    @Query('days') days = '30',
    @Query('limit') limit = '20',
  ) {
    return this.monitorService.getServiceClickRank({
      days: Number.parseInt(days, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @Get('role-stats')
  getRoleStats(@Query('days') days = '30') {
    return this.monitorService.getRoleStats({
      days: Number.parseInt(days, 10),
    });
  }

  @Get('no-result-questions')
  getNoResultQuestions(
    @Query('days') days = '30',
    @Query('limit') limit = '30',
  ) {
    return this.monitorService.getNoResultQuestions({
      days: Number.parseInt(days, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @Get('secondary-auth-issues')
  getSecondaryAuthIssues(
    @Query('days') days = '30',
    @Query('limit') limit = '50',
  ) {
    return this.monitorService.getSecondaryAuthIssues({
      days: Number.parseInt(days, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @Get('overview')
  getOverview(@Query('days') days = '30') {
    return this.monitorService.getOverview({
      days: Number.parseInt(days, 10),
    });
  }
}
