import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfileSummary } from '../profiles/profile-summary.types';
import { ProfileUpdateCandidate } from '../assistant/assistant.types';

type DifyChatMessageResponse = {
  answer?: string;
  conversation_id?: string;
};

type SseEvent = {
  event?: string;
  data?: Record<string, unknown>;
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
      const response = await this.sendChatMessage(apiKey, query, profile);
      const outputs = this.parseAnswerJson(response.answer);

      return {
        intent: this.toOptionalString(outputs.intent),
        category: this.toOptionalString(outputs.category),
        keywords: this.toStringArray(outputs.keywords),
        confidence: this.toOptionalNumber(outputs.confidence),
        profileUpdateCandidates: this.toProfileCandidates(outputs.profile_update_candidates),
      };
    } catch (error) {
      this.logger.warn(`Dify intent chat failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async sendChatMessage(
    apiKey: string,
    query: string,
    profile: ProfileSummary,
  ): Promise<DifyChatMessageResponse> {
    const baseUrl = this.normalizeBaseUrl(this.configService.get<string>('DIFY_API_BASE_URL') ?? 'https://api.dify.ai/v1');
    const controller = new AbortController();
    const timeoutMs = Number(this.configService.get<string>('DIFY_TIMEOUT_MS') ?? 5000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/chat-messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            profile_summary: JSON.stringify(profile),
          },
          query,
          response_mode: 'streaming',
          conversation_id: '',
          user: profile.userId || 'ai-service-navigator',
          files: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream')) {
        return await this.readStreamingAnswer(response);
      }

      return (await response.json()) as DifyChatMessageResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getIntentApiKey(): string | undefined {
    return this.configService.get<string>('DIFY_INTENT_API_KEY') || this.configService.get<string>('DIFY_API_KEY');
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/$/, '');
    return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
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

  private async readStreamingAnswer(response: Response): Promise<DifyChatMessageResponse> {
    const body = response.body;
    if (!body) {
      return {};
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let conversationId: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\n\n/);
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        const event = this.parseSseEvent(rawEvent);
        if (!event.data) {
          continue;
        }

        conversationId = this.toOptionalString(event.data.conversation_id) ?? conversationId;
        const eventAnswer = this.toOptionalString(event.data.answer);
        if (eventAnswer) {
          answer += eventAnswer;
        }

        if (event.event === 'message_end' || event.data.event === 'message_end') {
          return { answer, conversation_id: conversationId };
        }
      }
    }

    return { answer, conversation_id: conversationId };
  }

  private parseSseEvent(rawEvent: string): SseEvent {
    const result: SseEvent = {};
    const dataLines: string[] = [];

    for (const line of rawEvent.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        result.event = line.slice('event:'.length).trim();
      }

      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim());
      }
    }

    if (dataLines.length > 0) {
      const parsed = this.parseJson(dataLines.join('\n'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        result.data = parsed as Record<string, unknown>;
      }
    }

    return result;
  }

  private parseAnswerJson(answer: unknown): Record<string, unknown> {
    if (typeof answer !== 'string' || !answer.trim()) {
      return {};
    }

    const cleaned = answer
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = this.parseJson(cleaned);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  }
}
