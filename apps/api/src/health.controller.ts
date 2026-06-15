import { Controller, Get } from '@nestjs/common';
import { formatShanghaiTimestamp } from './common/time';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'ai-service-navigator-api',
      timestamp: formatShanghaiTimestamp(),
    };
  }
}
