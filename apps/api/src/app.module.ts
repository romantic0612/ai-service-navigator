import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ServicesModule } from './modules/services/services.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ProfilesModule,
    ServicesModule,
    AssistantModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
