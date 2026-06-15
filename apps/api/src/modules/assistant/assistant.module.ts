import { Module } from '@nestjs/common';
import { AiMemoryModule } from '../ai-memory/ai-memory.module';
import { DifyModule } from '../dify/dify.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ServicesModule } from '../services/services.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [ProfilesModule, ServicesModule, DifyModule, AiMemoryModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
