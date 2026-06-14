import { Injectable } from '@nestjs/common';
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
  ) {}

  async reply(userId: string, message: string): Promise<AssistantReply> {
    const profile = await this.profilesService.getSummary(userId);
    await this.profilesService.recordAskEvent(userId, message);

    const difyIntent = await this.difyService.recognizeIntent(message, profile);
    const searchQuery = [message, difyIntent?.intent, difyIntent?.category, ...(difyIntent?.keywords ?? [])]
      .filter(Boolean)
      .join(' ');
    const searchResult = await this.serviceItemsService.search(searchQuery);
    const serviceCards =
      searchResult.items.length > 0
        ? searchResult.items
        : await this.serviceItemsService.recommendForProfile(profile.tags);

    const profileUpdateCandidates = this.mergeProfileCandidates([
      ...this.extractProfileUpdateCandidates(message),
      ...(difyIntent?.profileUpdateCandidates ?? []),
    ]);

    if (serviceCards.length === 0) {
      return {
        action: 'no_reliable_result',
        message: '我暂时没有找到可靠的办理事项。你可以换一种说法，或提供更具体的办事场景。',
        profileUpdateCandidates,
      };
    }

    return {
      action: 'recommend_service',
      message: this.buildReplyMessage(serviceCards.length, Boolean(difyIntent?.intent), difyIntent?.intent),
      serviceCards,
      profileUpdateCandidates,
    };
  }

  private buildReplyMessage(count: number, usedDify: boolean, intent?: string): string {
    if (usedDify && intent) {
      return `我理解你想办理“${intent}”相关事项，先找到了 ${count} 个可靠入口，入口和流程以卡片为准。`;
    }

    return `我先按你的情况找到了 ${count} 个可能相关的办理事项，入口和流程以卡片为准。`;
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

    if (message.includes('考研')) {
      candidates.push({
        key: 'exam_plan',
        value: '考研',
        confidence: 0.92,
        sensitivity: 'medium',
        needConfirm: true,
        reason: '用户在对话中明确提到考研意向，可用于后续推荐成绩单、档案、复试材料等事项。',
      });
    }

    if (message.includes('找工作') || message.includes('就业') || message.includes('实习')) {
      candidates.push({
        key: 'interest',
        value: '就业',
        confidence: 0.86,
        sensitivity: 'medium',
        needConfirm: true,
        reason: '用户提到就业相关需求，可用于后续推荐就业协议、招聘信息、档案转递等事项。',
      });
    }

    return candidates;
  }
}
