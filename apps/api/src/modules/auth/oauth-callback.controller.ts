import { BadRequestException, Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProfilesService } from '../profiles/profiles.service';
import { OAuthClientService } from './oauth-client.service';
import { OAUTH_STATE_COOKIE, OAuthStateService } from './oauth-state.service';

@Controller()
export class OAuthCallbackController {
  private readonly logger = new Logger(OAuthCallbackController.name);

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

    this.logger.log('OAuth callback state verified, exchanging code for token');
    const token = await this.oauthClientService.exchangeCodeForToken(code);
    this.logger.log('OAuth access token exchanged, fetching profile');
    const profile = await this.oauthClientService.getProfile(token.access_token);
    this.logger.log(`OAuth profile fetched for user ${profile.id}, writing profile`);
    const normalizedProfile = await this.profilesService.upsertOAuthProfile(profile);
    const redirectUrl = `/?userId=${encodeURIComponent(normalizedProfile.userId)}`;

    this.logger.log(`OAuth profile stored for user ${normalizedProfile.userId}, redirecting to home`);
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
