import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfileSummary } from '../profiles/profile-summary.types';
import { ProfileUpdateCandidate } from '../assistant/assistant.types';

type DifyWorkflowResponse = {
  data?: {
    outputs?: Record<string, unknown>;
  };
};

export type DifyIntentResult = {
  intent?: string;
  category?: string;
  keywords: string[];
  confidence?: number;
  profileUpdateCandidates: ProfileUpdateCandidate[];
};

@Injectable()
export class DifyService {
  private readonly logger = new Logger(DifyService.name);

  constructor(private readonly configService: ConfigService) {}

  isIntentEnabled(): boolean {
    return Boolean(this.getIntentApiKey());
  }

  async recognizeIntent(query: string, profile: ProfileSummary): Promise<DifyIntentResult | null> {
    const apiKey = this.getIntentApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const response = await this.runWorkflow(apiKey, {
        query,
        profile_summary: JSON.stringify(profile),
      });
      const outputs = response.data?.outputs ?? {};

      return {
        intent: this.toOptionalString(outputs.intent),
        category: this.toOptionalString(outputs.category),
        keywords: this.toStringArray(outputs.keywords),
        confidence: this.toOptionalNumber(outputs.confidence),
        profileUpdateCandidates: this.toProfileCandidates(outputs.profile_update_candidates),
      };
    } catch (error) {
      this.logger.warn(`Dify intent workflow failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async runWorkflow(apiKey: string, inputs: Record<string, unknown>): Promise<DifyWorkflowResponse> {
    const baseUrl = this.configService.get<string>('DIFY_API_BASE_URL') ?? 'https://api.dify.ai/v1';
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/workflows/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        response_mode: 'blocking',
        user: String(inputs.profile_user_id ?? 'ai-service-navigator'),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as DifyWorkflowResponse;
  }

  private getIntentApiKey(): string | undefined {
    return this.configService.get<string>('DIFY_INTENT_API_KEY') || this.configService.get<string>('DIFY_API_KEY');
  }

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value) as unknown;
        return this.toStringArray(parsed);
      } catch {
        return value
          .split(/[,，\s]+/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return [];
  }

  private toProfileCandidates(value: unknown): ProfileUpdateCandidate[] {
    const parsed = typeof value === 'string' && value.trim() ? this.parseJson(value) : value;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => this.normalizeCandidate(item))
      .filter((item): item is ProfileUpdateCandidate => Boolean(item));
  }

  private normalizeCandidate(value: unknown): ProfileUpdateCandidate | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const key = this.toOptionalString(record.key);
    const candidateValue = this.toOptionalString(record.value);
    if (!key || !candidateValue) {
      return null;
    }

    const sensitivity = this.toOptionalString(record.sensitivity);
    return {
      key,
      value: candidateValue,
      confidence: this.toOptionalNumber(record.confidence) ?? 0.8,
      sensitivity: sensitivity === 'high' || sensitivity === 'medium' ? sensitivity : 'low',
      needConfirm: record.needConfirm === false || record.need_confirm === false ? false : true,
      reason: this.toOptionalString(record.reason) ?? `用户提到 ${candidateValue}，可用于后续推荐。`,
    };
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
