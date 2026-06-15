import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHash, createHmac, randomBytes } from 'node:crypto';

export type MonitorAuthCheckResult = {
  authorized: boolean;
  userId: string;
  expiresAt: Date;
};

export type MonitorAuthTokenResult = {
  userId: string;
  token: string;
  expiresAt: Date;
};

const COOKIE_NAME = 'aibs_monitor_session';

@Injectable()
export class MonitorAuthService {
  private readonly accessCode: string | null;
  private readonly allowlist: Set<string>;
  private readonly sessionSecret: string;
  private readonly _sessionTtlSeconds: number;

  constructor(config: ConfigService) {
    this.accessCode = config.get<string>('MONITOR_ACCESS_CODE')?.trim() || null;
    const allowlistRaw = config.get<string>('MONITOR_ALLOWED_USER_IDS')?.trim() || '';
    this.allowlist = new Set(
      allowlistRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
    this.sessionSecret = config.get<string>('MONITOR_SESSION_SECRET') || 'aibs-monitor-secret';
    this._sessionTtlSeconds = Number(config.get<string>('MONITOR_SESSION_TTL_SECONDS') ?? 86400);
  }

  get sessionCookieName() {
    return COOKIE_NAME;
  }

  get sessionTtlMs() {
    return Math.max(1, this._sessionTtlSeconds) * 1000;
  }

  get sessionTtlSeconds() {
    return Math.max(1, this._sessionTtlSeconds);
  }

  isAuthEnabled() {
    return Boolean(this.accessCode || this.allowlist.size > 0);
  }

  async login(userId: string, accessCode?: string): Promise<MonitorAuthTokenResult> {
    const normalizedUserId = this.normalizeId(userId);
    this.assertLoginAllowed(normalizedUserId, accessCode);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    const token = this.issueToken(normalizedUserId, expiresAt);
    return { userId: normalizedUserId, token, expiresAt };
  }

  authStatus(req: Request): MonitorAuthCheckResult {
    const status = this.checkFromRequest(req);
    if (!this.isAuthEnabled() && !status.authorized) {
      return { authorized: true, userId: 'admin', expiresAt: new Date(Date.now() + this.sessionTtlMs) };
    }
    return status;
  }

  checkFromRequest(req: Request): MonitorAuthCheckResult {
    const token = this.getCookie(req, COOKIE_NAME);
    if (!token) {
      return { authorized: false, userId: '', expiresAt: new Date() };
    }
    const parsed = this.parseToken(token);
    if (!parsed) {
      return { authorized: false, userId: '', expiresAt: new Date() };
    }
    const now = Date.now();
    if (parsed.expiresAt <= now) {
      return { authorized: false, userId: '', expiresAt: new Date() };
    }
    this.assertSessionAllowed(parsed.userId);
    return { authorized: true, userId: parsed.userId, expiresAt: new Date(parsed.expiresAt) };
  }

  private parseToken(token: string): { userId: string; expiresAt: number; tokenId: string } | null {
    const [payloadPart, signature] = token.split('.');
    if (!payloadPart || !signature) {
      return null;
    }

    let payload = '';
    try {
      payload = Buffer.from(payloadPart, 'base64').toString('utf8');
    } catch {
      return null;
    }
    const expectedSignature = this.signature(payload);
    if (!secureCompare(expectedSignature, signature)) {
      return null;
    }

    const [userId, expiresAtText, tokenId] = payload.split('|');
    if (!userId || !expiresAtText || !tokenId) {
      return null;
    }
    const expiresAt = Number.parseInt(expiresAtText, 10);
    if (!Number.isFinite(expiresAt)) {
      return null;
    }
    return { userId, expiresAt, tokenId };
  }

  private issueToken(userId: string, expiresAt: Date) {
    const tokenId = randomBytes(8).toString('hex');
    const payload = `${userId}|${expiresAt.getTime()}|${tokenId}`;
    return `${Buffer.from(payload).toString('base64')}.${this.signature(payload)}`;
  }

  private signature(payload: string) {
    return createHmac('sha256', this.sessionSecret).update(payload).digest('hex');
  }

  private assertLoginAllowed(userId: string, accessCode?: string) {
    this.assertSessionAllowed(userId);
    if (this.accessCode && accessCode !== this.accessCode) {
      throw new BadRequestException('monitor access code invalid');
    }
  }

  private assertSessionAllowed(userId: string) {
    if (!this.isAuthEnabled()) {
      return;
    }
    if (this.allowlist.size > 0 && !this.allowlist.has(userId)) {
      throw new BadRequestException('monitor user not allowed');
    }
  }

  private normalizeId(userId: string) {
    return (userId || '').trim();
  }

  private getCookie(req: Request, name: string) {
    const cookieHeader = req.headers.cookie || '';
    const parts = cookieHeader.split(';').map((item) => item.trim());
    const target = parts.find((item) => item.startsWith(`${name}=`));
    if (!target) {
      return null;
    }
    return target.substring(name.length + 1);
  }
}

function secureCompare(expected: string, actual: string) {
  if (expected.length !== actual.length) {
    return false;
  }
  const left = createHash('sha256').update(expected).digest();
  const right = createHash('sha256').update(actual).digest();
  return left.equals(right);
}
