import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export const OAUTH_STATE_COOKIE = 'aibs_oauth_state';

type StateRecord = {
  state: string;
  expiresAt: number;
};

@Injectable()
export class OAuthStateService {
  private readonly states = new Map<string, StateRecord>();
  private readonly ttlMs = 5 * 60 * 1000;

  createState(): string {
    this.cleanup();
    const state = randomBytes(24).toString('hex');
    this.states.set(state, {
      state,
      expiresAt: Date.now() + this.ttlMs,
    });
    return state;
  }

  consumeState(state: string): boolean {
    const record = this.states.get(state);
    this.states.delete(state);

    if (!record) {
      return false;
    }

    return record.expiresAt >= Date.now();
  }

  private cleanup() {
    const now = Date.now();
    for (const [state, record] of this.states.entries()) {
      if (record.expiresAt < now) {
        this.states.delete(state);
      }
    }
  }
}
