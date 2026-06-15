import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MonitorController } from './monitor.controller';
import { AssistantMonitorController } from './assistant-monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorAuthService } from './monitor-auth.service';
import { MonitorAuthGuard } from './monitor-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MonitorController, AssistantMonitorController],
  providers: [MonitorService, MonitorAuthService, MonitorAuthGuard],
})
export class MonitorModule {}
