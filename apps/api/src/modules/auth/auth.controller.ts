import { Controller, Get } from '@nestjs/common';
import { OAuthConfigService } from './oauth-config.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly oauthConfigService: OAuthConfigService) {}

  @Get('oauth/login-url')
  getLoginUrl() {
    return this.oauthConfigService.buildAuthorizeUrl();
  }
}
