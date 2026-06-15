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

export type MonitorServiceClickItem = {
  serviceItemId: string;
  title: string;
  clicks: number;
  firstClick: string;
  lastClick: string;
};

export type MonitorRoleStat = {
  role: string;
  askCount: number;
  affectedUsers: number;
  rate: number;
};

export type MonitorNoResultItem = {
  queryText: string;
  count: number;
  firstAt: string;
  lastAt: string;
};

export type MonitorAuthIssueCase = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  serviceItemId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type MonitorAuthIssue = {
  hotItems: Array<{
    serviceItemId: string | null;
    title: string;
    issues: number;
    latestAt: string;
  }>;
  recentCases: MonitorAuthIssueCase[];
};

export type MonitorOverview = {
  days: number;
  topServices: MonitorServiceClickItem[];
  roleStats: MonitorRoleStat[];
  noResultQuestions: MonitorNoResultItem[];
  secondaryAuthIssues: MonitorAuthIssue;
  updatedAt: string;
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

export async function recordSecondaryAuthIssue(userId: string, serviceItemId: string, extra?: Record<string, string>) {
  const response = await axios.post<{ recorded: boolean; reason?: string }>(`${apiBaseUrl}/profiles/${userId}/events`, {
    eventType: 'secondary_auth_issue',
    serviceItemId,
    metadata: extra ?? {},
  });

  return response.data;
}

export async function getMonitorOverview(days = 30): Promise<MonitorOverview> {
  const response = await axios.get<MonitorOverview>(`${apiBaseUrl}/monitor/overview`, {
    params: { days },
  });

  return response.data;
}

export async function getMonitorServiceClickRank(days = 30, limit = 20): Promise<MonitorServiceClickItem[]> {
  const response = await axios.get<MonitorServiceClickItem[]>(`${apiBaseUrl}/monitor/service-click-rank`, {
    params: { days, limit },
  });

  return response.data;
}

export async function getMonitorRoleStats(days = 30): Promise<MonitorRoleStat[]> {
  const response = await axios.get<MonitorRoleStat[]>(`${apiBaseUrl}/monitor/role-stats`, {
    params: { days },
  });

  return response.data;
}

export async function getMonitorNoResultQuestions(days = 30, limit = 30): Promise<MonitorNoResultItem[]> {
  const response = await axios.get<MonitorNoResultItem[]>(`${apiBaseUrl}/monitor/no-result-questions`, {
    params: { days, limit },
  });

  return response.data;
}

export async function getMonitorSecondaryAuthIssues(
  days = 30,
  limit = 50,
): Promise<MonitorAuthIssue> {
  const response = await axios.get<MonitorAuthIssue>(`${apiBaseUrl}/monitor/secondary-auth-issues`, {
    params: { days, limit },
  });

  return response.data;
}

export async function recordUserEvent(
  userId: string,
  eventType:
    | 'open_service'
    | 'view_service'
    | 'open_asset'
    | 'secondary_auth_issue'
    | 'no_result',
  serviceItemId?: string,
  metadata?: Record<string, unknown>,
) {
  const response = await axios.post<{ recorded: boolean; reason?: string }>(`${apiBaseUrl}/profiles/${userId}/events`, {
    eventType,
    serviceItemId,
    metadata,
  });

  return response.data;
}
