import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:3100' : '');

export type ServiceCard = {
  id: string;
  title: string;
  category: string;
  description?: string;
  entryUrl: string;
  department?: string;
  contactPerson?: string;
  contactPhone?: string;
  serviceTime?: string;
  materials: string[];
  processSteps: string[];
  notice?: string;
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

export type AssistantReply = {
  action: 'clarify' | 'recommend_service' | 'no_reliable_result';
  message: string;
  clarifyQuestion?: string;
  clarifyOptions?: string[];
  serviceCards?: ServiceCard[];
  profileUpdateCandidates?: ProfileUpdateCandidate[];
};

export async function sendAssistantMessage(message: string, userId = 'demo-user') {
  const response = await axios.post<AssistantReply>(`${apiBaseUrl}/assistant/message`, {
    userId,
    message,
  });

  return response.data;
}
