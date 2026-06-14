import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfileDto } from '../profiles/oauth-profile.dto';

type AccessTokenResponse = {
  access_token: string;
  expires_in?: number;
};

@Injectable()
export class OAuthClientService {
  private readonly logger = new Logger(OAuthClientService.name);

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
      const errorBody = await response.text();
      this.logger.error(`OAuth accessToken request failed: ${response.status}; body=${errorBody}`);
      throw new BadGatewayException(`OAuth accessToken request failed: ${response.status}`);
    }

    const payload = await this.parseAccessTokenResponse(response);
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
      const errorBody = await response.text();
      this.logger.error(`OAuth profile request failed: ${response.status}; body=${errorBody}`);
      throw new BadGatewayException(`OAuth profile request failed: ${response.status}`);
    }

    return (await response.json()) as OAuthProfileDto;
  }

  private async parseAccessTokenResponse(response: Response): Promise<Partial<AccessTokenResponse>> {
    const text = await response.text();

    try {
      return JSON.parse(text) as Partial<AccessTokenResponse>;
    } catch {
      const params = new URLSearchParams(text);
      return {
        access_token: params.get('access_token') ?? undefined,
        expires_in: params.get('expires_in') ? Number(params.get('expires_in')) : undefined,
      };
    }
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }

    return value;
  }
}
