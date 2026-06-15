import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MiniMaxChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type MiniMaxChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class MiniMaxService {
  private readonly logger = new Logger(MiniMaxService.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.getApiKey() && this.getBaseUrl());
  }

  async jsonChat(systemPrompt: string, userPayload: unknown): Promise<Record<string, unknown> | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const content = await this.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload) },
      ]);

      return this.parseJsonObject(content);
    } catch (error) {
      this.logger.warn(`MiniMax chat failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async chat(messages: MiniMaxChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeoutMs = Number(this.configService.get<string>('MINIMAX_TIMEOUT_MS') ?? 12000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.getChatCompletionsUrl(), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.configService.get<string>('MINIMAX_MODEL') ?? 'minimax-2.5',
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as MiniMaxChatResponse;
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timeout);
    }
  }

  private getApiKey(): string | undefined {
    return this.configService.get<string>('MINIMAX_API_KEY');
  }

  private getBaseUrl(): string | undefined {
    return this.configService.get<string>('MINIMAX_API_BASE_URL');
  }

  private getChatCompletionsUrl(): string {
    const baseUrl = (this.getBaseUrl() ?? '').replace(/\/$/, '');
    if (baseUrl.endsWith('/chat/completions')) {
      return baseUrl;
    }

    return `${baseUrl}/chat/completions`;
  }

  private parseJsonObject(content: string): Record<string, unknown> | null {
    const cleaned = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
