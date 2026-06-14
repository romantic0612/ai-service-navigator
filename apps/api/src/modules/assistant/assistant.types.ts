import { ServiceItemCard } from '../services/service-item.types';

export type AssistantAction =
  | 'clarify'
  | 'recommend_service'
  | 'role_mismatch'
  | 'no_reliable_result';

export type ProfileUpdateCandidate = {
  key: string;
  value: string;
  confidence: number;
  sensitivity: 'low' | 'medium' | 'high';
  needConfirm: boolean;
  reason: string;
};

export type AssistantReply = {
  action: AssistantAction;
  message: string;
  clarifyQuestion?: string;
  clarifyOptions?: string[];
  serviceCards?: ServiceItemCard[];
  profileUpdateCandidates?: ProfileUpdateCandidate[];
};
