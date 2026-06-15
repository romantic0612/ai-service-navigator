import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileSummary } from '../profiles/profile-summary.types';
import { ServiceItemCard } from '../services/service-item.types';
import { ExtractedMemory, GuideReply, MemoryExtractionContext, OpeningReply, PreferenceUpdate } from './ai-memory.types';
import { MiniMaxService } from './minimax.service';

const GUIDE_QUERIES = [
  '你好',
  '您好',
  'hi',
  'hello',
  '你是谁',
  '你能干什么',
  '有什么功能',
  '怎么用',
  '如何使用',
  '我不知道办什么',
  '能做什么',
  '换一个事项',
  '换个事项',
  '换哪一个',
  '换一个',
  '看看热门服务',
  '热门服务',
  '看看常用服务',
  '常用服务',
];

@Injectable()
export class AiMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly miniMaxService: MiniMaxService,
  ) {}

  isGuideQuery(message: string): boolean {
    const normalized = message.trim().toLowerCase().replace(/\s+/g, '');
    return GUIDE_QUERIES.some((query) => normalized === query || normalized.includes(query));
  }

  async generateGuide(profile: ProfileSummary, message = ''): Promise<GuideReply> {
    const recentMemories = await this.getRecentLowSensitivityMemories(profile.userId, 3);
    const popularServices = await this.getPopularServiceTitles(5);
    const modelResult = await this.miniMaxService.jsonChat(this.guidePrompt(), {
      profile,
      current_message: message,
      recent_memories: recentMemories,
      recent_common_services: popularServices,
    });
    const fallback = this.fallbackGuide(profile, recentMemories, popularServices, message);

    return {
      reply: this.toOptionalString(modelResult?.reply) ?? fallback.reply,
      suggestions: this.withFallbackStrings(this.toStringArray(modelResult?.suggestions).slice(0, 4), fallback.suggestions),
    };
  }

  async generateOpening(userId: string, profile: ProfileSummary): Promise<OpeningReply> {
    const recentMemories = await this.getRecentLowSensitivityMemories(userId, 5);
    const popularServices = await this.getPopularServiceTitles(3);
    const fallback = this.fallbackOpening(profile, recentMemories, popularServices);
    const modelResult = await this.miniMaxService.jsonChat(this.openingPrompt(), {
      profile,
      recent_memories: recentMemories,
      recent_common_services: popularServices,
    });

    return {
      opening: this.toOptionalString(modelResult?.opening) ?? fallback.opening,
      quickActions: this.withFallbackStrings(this.toStringArray(modelResult?.quick_actions).slice(0, 3), fallback.quickActions),
    };
  }

  processTurnInBackground(profile: ProfileSummary, context: MemoryExtractionContext): void {
    void this.extractAndSaveTurnMemory(profile, context).catch(() => undefined);
  }

  private async extractAndSaveTurnMemory(profile: ProfileSummary, context: MemoryExtractionContext): Promise<void> {
    if (context.serviceCards.length === 0 || this.hasSensitiveService(context.serviceCards)) {
      return;
    }

    const fallback: { memories: ExtractedMemory[]; preferenceUpdates: PreferenceUpdate[] } = this.fallbackExtraction(context.serviceCards);
    const modelResult = await this.miniMaxService.jsonChat(this.memoryExtractionPrompt(), {
      profile,
      user_message: context.message,
      assistant_reply: context.replyMessage,
      service_cards: context.serviceCards.map((card) => ({
        id: card.id,
        title: card.title,
        category: card.category,
        department: card.department,
        target_roles: card.targetRoles,
      })),
      output_schema: {
        memories: [
          {
            memory_type: 'service_intent',
            key: 'recent_service',
            value: '事项名称',
            summary: '一句话总结',
            confidence: 0.9,
            sensitivity: 'low',
            expires_days: 30,
          },
        ],
        preference_updates: [{ key: 'frequent_category', value: '分类名称', confidence: 0.8 }],
      },
    });

    const memories = this.toMemories(modelResult?.memories);
    const preferenceUpdates = this.toPreferenceUpdates(modelResult?.preference_updates);
    await this.saveMemories(context.userId, memories.length ? memories : fallback.memories);
    await this.savePreferenceUpdates(context.userId, preferenceUpdates.length ? preferenceUpdates : fallback.preferenceUpdates);
  }

  private async saveMemories(userId: string, memories: ExtractedMemory[]): Promise<void> {
    await this.ensureUserProfile(userId);

    for (const memory of memories) {
      if (!memory.key || !memory.value || memory.sensitivity === 'high') {
        continue;
      }

      const expiresAt = memory.expiresDays ? new Date(Date.now() + memory.expiresDays * 24 * 60 * 60 * 1000) : undefined;
      const memoryValue = memory.summary ? `${memory.value}｜${memory.summary}` : memory.value;

      await (this.prisma.userMemory as any).upsert({
        where: {
          userId_memoryKey_memoryValue: {
            userId,
            memoryKey: memory.key,
            memoryValue,
          },
        },
        create: {
          userId,
          memoryType: memory.memoryType || 'service_intent',
          memoryKey: memory.key,
          memoryValue,
          confidence: memory.confidence,
          source: 'INFERRED_FROM_CHAT',
          sensitivity: this.toPrismaSensitivity(memory.sensitivity),
          expiresAt,
        },
        update: {
          confidence: memory.confidence,
          source: 'INFERRED_FROM_CHAT',
          sensitivity: this.toPrismaSensitivity(memory.sensitivity),
          expiresAt,
        },
      });
    }
  }

  private async savePreferenceUpdates(userId: string, updates: PreferenceUpdate[]): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    await this.ensureUserProfile(userId);
    const existing = await this.prisma.userPreferenceProfile.findUnique({ where: { userId } });
    const existingTags = this.toObjectArray(existing?.customTags);
    const mergedTags = [...existingTags];

    for (const update of updates) {
      if (!update.key || !update.value) {
        continue;
      }

      const index = mergedTags.findIndex((item) => item.key === update.key && item.value === update.value);
      const nextItem = {
        key: update.key,
        value: update.value,
        confidence: update.confidence,
        updatedAt: new Date().toISOString(),
      };

      if (index >= 0) {
        mergedTags[index] = nextItem;
      } else {
        mergedTags.push(nextItem);
      }
    }

    await this.prisma.userPreferenceProfile.upsert({
      where: { userId },
      create: {
        userId,
        customTags: mergedTags as any,
        updatedBy: 'ai',
      },
      update: {
        customTags: mergedTags as any,
        updatedBy: 'ai',
      },
    });
  }

  private fallbackExtraction(serviceCards: ServiceItemCard[]): { memories: ExtractedMemory[]; preferenceUpdates: PreferenceUpdate[] } {
    const [topCard] = serviceCards;
    return {
      memories: [
        {
          memoryType: 'service_intent',
          key: 'recent_service',
          value: topCard.title,
          summary: `用户最近关注“${topCard.title}”办理事项。`,
          confidence: 0.86,
          sensitivity: 'low' as const,
          expiresDays: 30,
        },
      ],
      preferenceUpdates: topCard.category
        ? [
            {
              key: 'frequent_category',
              value: topCard.category,
              confidence: 0.72,
            },
          ]
        : [],
    };
  }

  private fallbackGuide(
    profile: ProfileSummary,
    recentMemories: Array<Record<string, unknown>>,
    popularServices: string[],
    message: string,
  ): GuideReply {
    const commonSuggestions = popularServices.length ? popularServices.slice(0, 3) : ['校园网账号服务', '电子签章服务', '校友卡'];
    if (['换一个事项', '换个事项', '换哪一个', '换一个'].some((text) => message.includes(text))) {
      return {
        reply: '可以。你想换成哪类事情？也可以直接点下面这些近期常用事项。',
        suggestions: commonSuggestions,
      };
    }

    const recentService = this.toOptionalString(recentMemories[0]?.memoryValue)?.split('｜')[0];
    if (recentService) {
      return {
        reply: `你好，我可以继续帮你处理“${recentService}”，也可以直接帮你找新的学校办事入口。你不用记事项名称，直接说想办什么就行。`,
        suggestions: [`继续查看${recentService}`, ...commonSuggestions].slice(0, 4),
      };
    }

    if (profile.role === '教职工') {
      return {
        reply: '你好，我可以帮你快速找到教职工常用办事入口，比如请假出差、电子签章、会议室预约、科研发票、部门运维账号申请。你可以直接说想办的事。',
        suggestions: popularServices.length ? commonSuggestions : ['教职工请假', '电子签章服务', '部门运维账号申请'],
      };
    }

    return {
      reply: '你好，我可以帮你快速找到学校线上办事入口。你可以直接说“校园网账号怎么充值”“学生档案去哪查”“校友卡怎么办”。',
      suggestions: popularServices.length ? commonSuggestions : ['校园网账号服务', '学生档案去向查询', '校友卡'],
    };
  }

  private fallbackOpening(profile: ProfileSummary, recentMemories: Array<Record<string, unknown>>, popularServices: string[]): OpeningReply {
    const recentService = this.toOptionalString(recentMemories[0]?.memoryValue)?.split('｜')[0];
    const commonActions = popularServices.length ? popularServices.slice(0, 2) : ['换一个事项', '校园网账号服务'];
    if (recentService) {
      return {
        opening: `上次你查了“${recentService}”，需要继续查看入口、流程或联系人吗？`,
        quickActions: [`继续查看${recentService}`, '换一个事项', ...commonActions].slice(0, 3),
      };
    }

    return {
      opening: `${profile.name ? `${profile.name}，` : ''}你好，可以直接告诉我你想办什么，我会优先给你学校数据库里的可靠入口。`,
      quickActions: popularServices.length ? popularServices.slice(0, 3) : ['校园网账号服务', '电子签章服务', '校友卡'],
    };
  }

  private async getPopularServiceTitles(take: number): Promise<string[]> {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const events = await this.prisma.userEvent.findMany({
        where: {
          eventType: 'open_service',
          serviceItemId: { not: null },
          createdAt: { gte: since },
        },
        select: { serviceItemId: true },
        take: 500,
      });
      const counts = new Map<string, number>();
      for (const event of events) {
        if (event.serviceItemId) {
          counts.set(event.serviceItemId, (counts.get(event.serviceItemId) ?? 0) + 1);
        }
      }

      const popularIds = [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, take)
        .map(([serviceItemId]) => serviceItemId);

      if (popularIds.length > 0) {
        const items = await this.prisma.serviceItem.findMany({
          where: { id: { in: popularIds }, status: 'ENABLED' },
          select: { id: true, title: true },
        });
        const titleById = new Map(items.map((item) => [item.id, item.title]));
        return popularIds.map((id) => titleById.get(id)).filter((title): title is string => Boolean(title));
      }

      const handlerCountItems = await this.prisma.serviceItem.findMany({
        where: {
          status: 'ENABLED',
          handlerCount: { not: null },
        },
        orderBy: { handlerCount: 'desc' },
        select: { title: true },
        take,
      });

      return handlerCountItems.map((item) => item.title);
    } catch {
      return [];
    }
  }

  private hasSensitiveService(serviceCards: ServiceItemCard[]): boolean {
    const sensitivePatterns = ['心理', '举报', '医疗', '互助', '困难', '资助', '处分', '申诉'];
    return serviceCards.some((card) =>
      [card.title, card.category, card.description, card.notice]
        .filter(Boolean)
        .some((text) => sensitivePatterns.some((pattern) => String(text).includes(pattern))),
    );
  }

  private async getRecentLowSensitivityMemories(userId: string, take: number): Promise<Array<Record<string, unknown>>> {
    try {
      const now = new Date();
      return (await (this.prisma.userMemory as any).findMany({
        where: {
          userId,
          sensitivity: 'LOW',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { updatedAt: 'desc' },
        take,
      })) as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  }

  private async ensureUserProfile(userId: string): Promise<void> {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        source: 'mock',
      },
      update: {},
    });
  }

  private toMemories(value: unknown): ExtractedMemory[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const memories: ExtractedMemory[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const record = item as Record<string, unknown>;
      const key = this.toOptionalString(record.key);
      const memoryValue = this.toOptionalString(record.value);
      if (!key || !memoryValue) {
        continue;
      }

      const sensitivity = this.toOptionalString(record.sensitivity);
      memories.push({
        memoryType: this.toOptionalString(record.memory_type) ?? 'service_intent',
        key,
        value: memoryValue,
        summary: this.toOptionalString(record.summary),
        confidence: this.toNumber(record.confidence) ?? 0.8,
        sensitivity: sensitivity === 'medium' || sensitivity === 'high' ? sensitivity : 'low',
        expiresDays: this.toNumber(record.expires_days),
      });
    }

    return memories;
  }

  private toPreferenceUpdates(value: unknown): PreferenceUpdate[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const key = this.toOptionalString(record.key);
        const preferenceValue = this.toOptionalString(record.value);
        if (!key || !preferenceValue) {
          return null;
        }

        return {
          key,
          value: preferenceValue,
          confidence: this.toNumber(record.confidence) ?? 0.75,
        };
      })
      .filter((item): item is PreferenceUpdate => Boolean(item));
  }

  private toObjectArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
  }

  private withFallbackStrings(value: string[], fallback: string[]): string[] {
    return value.length > 0 ? value : fallback;
  }

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private toPrismaSensitivity(value: 'low' | 'medium' | 'high') {
    if (value === 'high') {
      return 'HIGH';
    }

    if (value === 'medium') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private guidePrompt(): string {
    return [
      '你是安徽农业大学 AI 办事助手的引导模型。',
      '用户没有明确办事事项时，根据 OAuth 画像、低敏记忆，生成一句自然、简短的引导。',
      '如果 current_message 表示“换一个事项”，要追问用户想换哪个方向，并给 recent_common_services 中的候选。',
      '不要编造办事链接，不要说你能自动代办。',
      '输出严格 JSON：{"reply":"...","suggestions":["..."]}。',
    ].join('\n');
  }

  private memoryExtractionPrompt(): string {
    return [
      '你是安徽农业大学 AI 办事助手的离线记忆整理模型。',
      '只从本轮用户问题和已命中的数据库办事卡片中提取低敏、可用于下次承接的记忆。',
      '不要提取心理咨询、举报、医疗互助、困难资助等敏感事项。',
      '不要修改办事事实，不要生成链接。',
      '输出严格 JSON：{"memories":[...],"preference_updates":[...]}。',
    ].join('\n');
  }

  private openingPrompt(): string {
    return [
      '你是安徽农业大学 AI 办事助手的下次开场承接模型。',
      '根据用户画像和低敏记忆，生成一句不打扰、自然的开场承接语。',
      '不要提及敏感事项，不要编造办事结果，不要超过 45 个汉字。',
      '输出严格 JSON：{"opening":"...","quick_actions":["..."]}。',
    ].join('\n');
  }
}
