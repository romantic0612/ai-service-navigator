import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProfilesService } from '../profiles/profiles.service';
import { OAuthClientService } from './oauth-client.service';
import { OAuthStateService } from './oauth-state.service';

@Controller()
export class OAuthCallbackController {
  constructor(
    private readonly oauthClientService: OAuthClientService,
    private readonly oauthStateService: OAuthStateService,
    private readonly profilesService: ProfilesService,
  ) {}

  @Get('callback')
  async handleCallback(@Query('code') code?: string, @Query('state') state?: string, @Res() response?: Response) {
    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    if (!state || !this.oauthStateService.consumeState(state)) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    const token = await this.oauthClientService.exchangeCodeForToken(code);
    const profile = await this.oauthClientService.getProfile(token.access_token);
    const normalizedProfile = await this.profilesService.upsertOAuthProfile(profile);
    const redirectUrl = `/?userId=${encodeURIComponent(normalizedProfile.userId)}`;

    return response?.redirect(redirectUrl);
  }
}
