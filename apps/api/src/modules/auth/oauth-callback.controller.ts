import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
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
  async handleCallback(@Query('code') code?: string, @Query('state') state?: string) {
    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    if (!state || !this.oauthStateService.consumeState(state)) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    const token = await this.oauthClientService.exchangeCodeForToken(code);
    const profile = await this.oauthClientService.getProfile(token.access_token);
    const normalizedProfile = this.profilesService.normalizeOAuthProfile(profile);

    return {
      authenticated: true,
      expiresIn: token.expires_in,
      profile: normalizedProfile,
      next: 'Persist profile to MySQL after Prisma database connection is enabled.',
    };
  }
}
