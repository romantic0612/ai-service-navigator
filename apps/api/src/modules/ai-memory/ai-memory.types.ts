import { ServiceItemCard } from '../services/service-item.types';

export type MemoryExtractionContext = {
  userId: string;
  message: string;
  replyMessage: string;
  serviceCards: ServiceItemCard[];
};

export type ExtractedMemory = {
  memoryType: string;
  key: string;
  value: string;
  summary?: string;
  confidence: number;
  sensitivity: 'low' | 'medium' | 'high';
  expiresDays?: number;
};

export type PreferenceUpdate = {
  key: string;
  value: string;
  confidence: number;
};

export type MemoryExtractionResult = {
  memories: ExtractedMemory[];
  preferenceUpdates: PreferenceUpdate[];
};

export type GuideReply = {
  reply: string;
  suggestions: string[];
};

export type OpeningReply = {
  opening: string;
  quickActions: string[];
};
