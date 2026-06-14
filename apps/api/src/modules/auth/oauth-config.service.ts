import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthStateService } from './oauth-state.service';

@Injectable()
export class OAuthConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthStateService: OAuthStateService,
  ) {}

  buildAuthorizeUrl(): { loginUrl: string; state: string } {
    const authServer = this.requireConfig('OAUTH_AUTH_SERVER').replace(/\/$/, '');
    const clientId = this.requireConfig('OAUTH_CLIENT_ID');
    const redirectUri = this.requireConfig('OAUTH_REDIRECT_URI');
    const scope = this.configService.get<string>('OAUTH_SCOPE') ?? 'cas_get_userInfo';
    const state = this.oauthStateService.createState();

    const url = new URL(`${authServer}/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', scope);

    return {
      loginUrl: url.toString(),
      state,
    };
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }

    return value;
  }
}
