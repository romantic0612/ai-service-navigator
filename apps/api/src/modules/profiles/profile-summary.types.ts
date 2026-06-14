export type ProfileSummary = {
  userId: string;
  role?: string;
  college?: string;
  major?: string;
  grade?: string;
  campus?: string;
  studentStatus?: string;
  tags: string[];
  recentIntents: string[];
};
