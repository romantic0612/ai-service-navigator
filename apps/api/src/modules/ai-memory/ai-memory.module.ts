import { Module } from '@nestjs/common';
import { AiMemoryService } from './ai-memory.service';
import { MiniMaxService } from './minimax.service';

@Module({
  providers: [AiMemoryService, MiniMaxService],
  exports: [AiMemoryService],
})
export class AiMemoryModule {}
