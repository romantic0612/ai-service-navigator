export type ServiceItemCard = {
  id: string;
  title: string;
  category: string;
  description?: string;
  handlerCount?: number;
  entryUrl: string;
  department?: string;
  contactPerson?: string;
  contactPhone?: string;
  serviceTime?: string;
  basis?: string;
  materials: string[];
  processSteps: string[];
  notice?: string;
  lastVerifiedAt?: string;
};

export type ServiceSearchResult = {
  items: ServiceItemCard[];
  matchedBy: 'keyword' | 'category' | 'recommendation' | 'mock';
};
