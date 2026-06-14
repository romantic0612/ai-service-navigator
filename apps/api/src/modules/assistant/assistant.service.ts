import { Injectable } from '@nestjs/common';
import { ProfilesService } from '../profiles/profiles.service';
import { ServiceItemsService } from '../services/service-items.service';
import { AssistantReply, ProfileUpdateCandidate } from './assistant.types';

@Injectable()
export class AssistantService {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly serviceItemsService: ServiceItemsService,
  ) {}

  reply(userId: string, message: string): AssistantReply {
    const profile = this.profilesService.getSummary(userId);
    const searchResult = this.serviceItemsService.search(message);
    const serviceCards =
      searchResult.items.length > 0
        ? searchResult.items
        : this.serviceItemsService.recommendForProfile(profile.tags);

    const profileUpdateCandidates = this.extractProfileUpdateCandidates(message);

    if (serviceCards.length === 0) {
      return {
        action: 'no_reliable_result',
        message: '我暂时没有找到可靠的办理事项。你可以换一种说法，或提供更具体的办事场景。',
        profileUpdateCandidates,
      };
    }

    return {
      action: 'recommend_service',
      message: `我先按你的情况找到了 ${serviceCards.length} 个可能相关的办理事项，入口和流程以卡片为准。`,
      serviceCards,
      profileUpdateCandidates,
    };
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
