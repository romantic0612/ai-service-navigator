import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { ServicesModule } from '../services/services.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [ProfilesModule, ServicesModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
