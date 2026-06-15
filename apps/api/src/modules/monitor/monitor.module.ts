import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MonitorController } from './monitor.controller';
import { AssistantMonitorController } from './assistant-monitor.controller';
import { MonitorService } from './monitor.service';

@Module({
  imports: [PrismaModule],
  controllers: [MonitorController, AssistantMonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
