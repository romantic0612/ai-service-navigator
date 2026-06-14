import { BadRequestException, Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProfilesService } from '../profiles/profiles.service';
import { OAuthClientService } from './oauth-client.service';
import { OAUTH_STATE_COOKIE, OAuthStateService } from './oauth-state.service';

@Controller()
export class OAuthCallbackController {
  constructor(
    private readonly oauthClientService: OAuthClientService,
    private readonly oauthStateService: OAuthStateService,
    private readonly profilesService: ProfilesService,
  ) {}

  @Get('callback')
  async handleCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Req() request?: Request,
    @Res() response?: Response,
  ) {
    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    if (!state || !this.isValidState(state, request)) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    const token = await this.oauthClientService.exchangeCodeForToken(code);
    const profile = await this.oauthClientService.getProfile(token.access_token);
    const normalizedProfile = await this.profilesService.upsertOAuthProfile(profile);
    const redirectUrl = `/?userId=${encodeURIComponent(normalizedProfile.userId)}`;

    response?.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    return response?.redirect(redirectUrl);
  }

  private isValidState(state: string, request?: Request): boolean {
    const cookieState = this.parseCookie(request?.headers.cookie ?? '')[OAUTH_STATE_COOKIE];
    if (cookieState && cookieState === state) {
      this.oauthStateService.consumeState(state);
      return true;
    }

    return this.oauthStateService.consumeState(state);
  }

  private parseCookie(cookieHeader: string): Record<string, string> {
    return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
      const [rawKey, ...rawValue] = part.trim().split('=');
      if (rawKey) {
        cookies[rawKey] = decodeURIComponent(rawValue.join('='));
      }

      return cookies;
    }, {});
  }
}
