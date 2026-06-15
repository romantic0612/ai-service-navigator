import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:3100' : '');

export type ServiceAsset = {
  id: string;
  assetType: string;
  title?: string;
  url: string;
  altText?: string;
};

export type ServiceCard = {
  id: string;
  title: string;
  category: string;
  description?: string;
  targetRoles: string[];
  entryUrl: string;
  department?: string;
  contactPerson?: string;
  contactPhone?: string;
  serviceTime?: string;
  materials: string[];
  processSteps: string[];
  notice?: string;
  assets: ServiceAsset[];
  lastVerifiedAt?: string;
};

export type ProfileUpdateCandidate = {
  key: string;
  value: string;
  confidence: number;
  sensitivity: 'low' | 'medium' | 'high';
  needConfirm: boolean;
  reason: string;
};

export type ProfileSummary = {
  userId: string;
  name?: string;
  role?: string;
  college?: string;
  major?: string;
  grade?: string;
  campus?: string;
  studentStatus?: string;
  tags: string[];
  recentIntents: string[];
};

export type AssistantReply = {
  action: 'clarify' | 'guide' | 'recommend_service' | 'role_mismatch' | 'no_reliable_result';
  message: string;
  clarifyQuestion?: string;
  clarifyOptions?: string[];
  guideSuggestions?: string[];
  serviceCards?: ServiceCard[];
  profileUpdateCandidates?: ProfileUpdateCandidate[];
};

export type AssistantOpening = {
  opening: string;
  quickActions: string[];
};

export async function getProfileSummary(userId: string) {
  const response = await axios.get<ProfileSummary>(`${apiBaseUrl}/profiles/${userId}/summary`);

  return response.data;
}

export async function sendAssistantMessage(message: string, userId: string) {
  const response = await axios.post<AssistantReply>(`${apiBaseUrl}/assistant/message`, {
    userId,
    message,
  });

  return response.data;
}

export async function getAssistantOpening(userId: string) {
  const response = await axios.get<AssistantOpening>(`${apiBaseUrl}/assistant/opening/${userId}`);

  return response.data;
}

export async function saveProfileMemory(candidate: ProfileUpdateCandidate, userId: string) {
  const response = await axios.post<{ saved: boolean; reason?: string }>(`${apiBaseUrl}/profiles/${userId}/memories`, {
    key: candidate.key,
    value: candidate.value,
    confidence: candidate.confidence,
    sensitivity: candidate.sensitivity,
    needConfirm: candidate.needConfirm,
    reason: candidate.reason,
  });

  return response.data;
}
