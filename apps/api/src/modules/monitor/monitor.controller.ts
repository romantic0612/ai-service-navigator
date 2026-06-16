import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MonitorAuthGuard } from './monitor-auth.guard';
import { MonitorService } from './monitor.service';

@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @UseGuards(MonitorAuthGuard)
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

  @UseGuards(MonitorAuthGuard)
  @Get('role-stats')
  getRoleStats(@Query('days') days = '30') {
    return this.monitorService.getRoleStats({
      days: Number.parseInt(days, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
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

  @UseGuards(MonitorAuthGuard)
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

  @UseGuards(MonitorAuthGuard)
  @Get('overview')
  getOverview(@Query('days') days = '30') {
    return this.monitorService.getOverview({
      days: Number.parseInt(days, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
  @Get('usage-trend')
  getUsageTrend(@Query('days') days = '30') {
    return this.monitorService.getUsageTrend({
      days: Number.parseInt(days, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
  @Get('hourly-activity')
  getHourlyActivity(@Query('days') days = '30') {
    return this.monitorService.getHourlyActivity({
      days: Number.parseInt(days, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
  @Get('top-questions')
  getTopQuestions(@Query('days') days = '30', @Query('limit') limit = '20') {
    return this.monitorService.getTopQuestions({
      days: Number.parseInt(days, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
  @Get('assistant-turns')
  getRecentAssistantTurns(@Query('limit') limit = '30') {
    return this.monitorService.getRecentAssistantTurns(Number.parseInt(limit, 10));
  }

  @UseGuards(MonitorAuthGuard)
  @Get('unmet-needs')
  getUnmetNeeds(@Query('days') days = '30', @Query('limit') limit = '20') {
    return this.monitorService.getUnmetNeeds({
      days: Number.parseInt(days, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
  @Post('unmet-needs/:needKey/priority')
  updateUnmetNeedPriority(
    @Param('needKey') needKey: string,
    @Body() body: { priority?: string; note?: string },
  ) {
    return this.monitorService.updateUnmetNeedPriority(needKey, body);
  }

  @UseGuards(MonitorAuthGuard)
  @Post('unmet-needs/:needKey/resolve')
  resolveUnmetNeed(
    @Param('needKey') needKey: string,
    @Body() body: { resolvedTitle?: string; message?: string; serviceItemId?: string; resolvedBy?: string },
  ) {
    return this.monitorService.resolveUnmetNeed(needKey, body);
  }

  @UseGuards(MonitorAuthGuard)
  @Post('unmet-needs/:needKey/archive')
  archiveUnmetNeed(@Param('needKey') needKey: string) {
    return this.monitorService.archiveUnmetNeed(needKey);
  }
}
