import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfileDto } from '../profiles/oauth-profile.dto';

type AccessTokenResponse = {
  access_token: string;
  expires_in?: number;
};

@Injectable()
export class OAuthClientService {
  constructor(private readonly configService: ConfigService) {}

  async exchangeCodeForToken(code: string): Promise<AccessTokenResponse> {
    const authServer = this.requireConfig('OAUTH_AUTH_SERVER').replace(/\/$/, '');
    const url = new URL(`${authServer}/accessToken`);
    url.searchParams.set('code', code);
    url.searchParams.set('client_id', this.requireConfig('OAUTH_CLIENT_ID'));
    url.searchParams.set('client_secret', this.requireConfig('OAUTH_CLIENT_SECRET'));
    url.searchParams.set('grant_type', 'authorization_code');
    url.searchParams.set('redirect_uri', this.requireConfig('OAUTH_REDIRECT_URI'));

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(`OAuth accessToken request failed: ${response.status}`);
    }

    const payload = (await response.json()) as Partial<AccessTokenResponse>;
    if (!payload.access_token) {
      throw new BadGatewayException('OAuth accessToken response missing access_token');
    }

    return {
      access_token: payload.access_token,
      expires_in: payload.expires_in,
    };
  }

  async getProfile(accessToken: string): Promise<OAuthProfileDto> {
    const authServer = this.requireConfig('OAUTH_AUTH_SERVER').replace(/\/$/, '');
    const url = new URL(`${authServer}/profile`);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(`OAuth profile request failed: ${response.status}`);
    }

    return (await response.json()) as OAuthProfileDto;
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }

    return value;
  }
}
