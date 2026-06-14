import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuthController } from './auth.controller';
import { OAuthClientService } from './oauth-client.service';
import { OAuthCallbackController } from './oauth-callback.controller';
import { OAuthConfigService } from './oauth-config.service';
import { OAuthStateService } from './oauth-state.service';

@Module({
  imports: [ProfilesModule],
  controllers: [AuthController, OAuthCallbackController],
  providers: [OAuthConfigService, OAuthClientService, OAuthStateService],
  exports: [OAuthConfigService],
})
export class AuthModule {}
