import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { OAuthConfigService } from './oauth-config.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly oauthConfigService: OAuthConfigService) {}

  @Get('oauth/login-url')
  getLoginUrl() {
    return this.oauthConfigService.buildAuthorizeUrl();
  }

  @Get('oauth/login')
  login(@Res() response: Response) {
    const { loginUrl } = this.oauthConfigService.buildAuthorizeUrl();
    return response.redirect(loginUrl);
  }
}
