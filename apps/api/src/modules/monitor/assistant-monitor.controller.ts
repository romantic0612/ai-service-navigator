import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { MonitorAuthGuard } from './monitor-auth.guard';
import { MonitorAuthLoginDto, MonitorAuthStatusDto, MonitorLoginDto } from './monitor-auth.dto';
import { MonitorAuthService } from './monitor-auth.service';
import { MonitorService } from './monitor.service';

@Controller('assistant/monitor')
export class AssistantMonitorController {
  constructor(
    private readonly monitorService: MonitorService,
    private readonly monitorAuthService: MonitorAuthService,
  ) {}

  @Post('login')
  async login(@Body() body: MonitorLoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const loginResult = await this.monitorAuthService.login(body.userId, body.accessCode);
      res.cookie(this.monitorAuthService.sessionCookieName, loginResult.token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
        maxAge: this.monitorAuthService.sessionTtlMs,
      });

      const response: MonitorAuthLoginDto = {
        authorized: true,
        userId: loginResult.userId,
        expireAt: loginResult.expiresAt.toISOString(),
      };
      return response;
    } catch {
      return {
        authorized: false,
        message: '登录失败，请确认账号与口令无误',
      } as MonitorAuthLoginDto;
    }
  }

  @Get('session')
  getSession(@Req() req: Request) {
    const status = this.monitorAuthService.authStatus(req);
    const response: MonitorAuthStatusDto = {
      authorized: status.authorized,
      userId: status.userId,
      expireAt: status.expiresAt.toISOString(),
    };
    return response;
  }

  @Get('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.monitorAuthService.sessionCookieName, {
      path: '/',
    });
    return { authorized: false };
  }

  @UseGuards(MonitorAuthGuard)
  @Get('service-click-rank')
  getServiceClickRank(@Query('days') days = '30', @Query('limit') limit = '20') {
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
  getNoResultQuestions(@Query('days') days = '30', @Query('limit') limit = '30') {
    return this.monitorService.getNoResultQuestions({
      days: Number.parseInt(days, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @UseGuards(MonitorAuthGuard)
  @Get('secondary-auth-issues')
  getSecondaryAuthIssues(@Query('days') days = '30', @Query('limit') limit = '50') {
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
}
