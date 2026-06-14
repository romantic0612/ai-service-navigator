import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { OAuthConfigService } from './oauth-config.service';
import { OAUTH_STATE_COOKIE } from './oauth-state.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly oauthConfigService: OAuthConfigService) {}

  @Get('oauth/login-url')
  getLoginUrl() {
    return this.oauthConfigService.buildAuthorizeUrl();
  }

  @Get('oauth/login')
  login(@Res() response: Response) {
    const { loginUrl, state } = this.oauthConfigService.buildAuthorizeUrl();
    response.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
    return response.redirect(loginUrl);
  }
}
