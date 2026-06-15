import { Injectable } from '@nestjs/common';
import { AiMemoryService } from '../ai-memory/ai-memory.service';
import { ProfileSummary } from '../profiles/profile-summary.types';
import { ServiceItemCard } from '../services/service-item.types';
import { DifyService } from '../dify/dify.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ServiceItemsService } from '../services/service-items.service';
import { AssistantReply, ProfileUpdateCandidate } from './assistant.types';

@Injectable()
export class AssistantService {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly serviceItemsService: ServiceItemsService,
    private readonly difyService: DifyService,
    private readonly aiMemoryService: AiMemoryService,
  ) {}

  async opening(userId: string) {
    const profile = await this.profilesService.getSummary(userId);
    return this.aiMemoryService.generateOpening(userId, profile);
  }

  async reply(userId: string, message: string): Promise<AssistantReply> {
    const profile = await this.profilesService.getSummary(userId);
    await this.profilesService.recordAskEvent(userId, message);

    if (this.aiMemoryService.isGuideQuery(message)) {
      const guide = await this.aiMemoryService.generateGuide(profile, message);
      return {
        action: 'guide',
        message: guide.reply,
        guideSuggestions: guide.suggestions,
        profileUpdateCandidates: [],
      };
    }

    let difyIntent: Awaited<ReturnType<DifyService['recognizeIntent']>> = null;
    let searchQuery = message;
    let searchResult = await this.serviceItemsService.search(searchQuery, profile);

    if (searchResult.items.length === 0) {
      difyIntent = await this.difyService.recognizeIntent(message, profile);
      searchQuery = [message, difyIntent?.intent, difyIntent?.category, ...(difyIntent?.keywords ?? [])]
        .filter(Boolean)
        .join(' ');
      searchResult = await this.serviceItemsService.search(searchQuery, profile);
    }

    const roleMismatchResult =
      searchResult.items.length === 0
        ? await this.serviceItemsService.search(searchQuery, profile, { ignoreRoleFilter: true })
        : undefined;
    const serviceCards =
      searchResult.items.length > 0
        ? searchResult.items
        : roleMismatchResult?.items.length
          ? roleMismatchResult.items
          : [];

    const profileUpdateCandidates = this.mergeProfileCandidates([
      ...this.extractProfileUpdateCandidates(message),
      ...(difyIntent?.profileUpdateCandidates ?? []),
    ]);

    if (serviceCards.length === 0) {
      await this.profilesService.recordUserEvent(userId, {
        eventType: 'no_result',
        queryText: message,
        metadata: {
          fallbackUsed: Boolean(difyIntent?.intent),
          intent: difyIntent?.intent,
          category: difyIntent?.category,
        },
      });
      return {
        action: 'no_reliable_result',
        message: '当前问题没匹配到稳定可办理的事项，建议你先从“学生办事入口”里按办事名称或对象筛选后再试。',
        profileUpdateCandidates,
      };
    }

    if (searchResult.items.length === 0 && roleMismatchResult?.items.length) {
      const messageText = this.buildRoleMismatchMessage(profile, serviceCards);
      this.aiMemoryService.processTurnInBackground(profile, {
        userId,
        message,
        replyMessage: messageText,
        serviceCards,
      });

      return {
        action: 'role_mismatch',
        message: messageText,
        serviceCards,
        profileUpdateCandidates,
      };
    }

    const messageText = this.buildReplyMessage(serviceCards.length, Boolean(difyIntent?.intent), difyIntent?.intent);
    this.aiMemoryService.processTurnInBackground(profile, {
      userId,
      message,
      replyMessage: messageText,
      serviceCards,
    });

    return {
      action: 'recommend_service',
      message: messageText,
      serviceCards,
      profileUpdateCandidates,
    };
  }

  private buildReplyMessage(count: number, usedDify: boolean, intent?: string): string {
    if (usedDify && intent) {
      return `已识别到你要办“${intent}”，我给你筛出了 ${count} 个可直接办理入口，先试试看吧。`;
    }

    return `我给你找到了 ${count} 个可直接办理的入口，点开就能开始。`;
  }

  private buildRoleMismatchMessage(profile: ProfileSummary, serviceCards: ServiceItemCard[]): string {
    const roleText = profile.role ? `当前身份为【${profile.role}】` : '当前身份未知';
    const targetRoles = [...new Set(serviceCards.flatMap((card) => card.targetRoles))].filter(Boolean);
    const targetText = targetRoles.length ? `该事项适配身份为：${targetRoles.join('，')}` : '';

    return `这条结果和${roleText}不完全匹配，以下是可查看的事项：${targetText}，如果你有相符身份，点开后可继续办理。`;
  }

  private mergeProfileCandidates(candidates: ProfileUpdateCandidate[]): ProfileUpdateCandidate[] {
    const result = new Map<string, ProfileUpdateCandidate>();
    for (const candidate of candidates) {
      result.set(`${candidate.key}:${candidate.value}`, candidate);
    }

    return [...result.values()];
  }

  private extractProfileUpdateCandidates(message: string): ProfileUpdateCandidate[] {
    const candidates: ProfileUpdateCandidate[] = [];

    if (message.includes('考试')) {
      candidates.push({
        key: 'exam_plan',
        value: '考试',
        confidence: 0.92,
        sensitivity: 'medium',
        needConfirm: true,
        reason: '识别到你可能在提到考试相关场景，可用于后续更精细的提醒。',
      });
    }

    if (message.includes('就业') || message.includes('考研') || message.includes('实习')) {
      candidates.push({
        key: 'interest',
        value: '就业',
        confidence: 0.86,
        sensitivity: 'medium',
        needConfirm: true,
        reason: '识别到你关注就业/实习/考研方向，后续可优先推荐相关入口。',
      });
    }

    return candidates;
  }
}
