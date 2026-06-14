export type ServiceItemAssetCard = {
  id: string;
  assetType: string;
  title?: string;
  url: string;
  altText?: string;
};

export type ServiceItemCard = {
  id: string;
  title: string;
  category: string;
  description?: string;
  handlerCount?: number;
  targetRoles: string[];
  entryUrl: string;
  department?: string;
  contactPerson?: string;
  contactPhone?: string;
  serviceTime?: string;
  basis?: string;
  materials: string[];
  processSteps: string[];
  notice?: string;
  assets: ServiceItemAssetCard[];
  lastVerifiedAt?: string;
};

export type ServiceSearchResult = {
  items: ServiceItemCard[];
  matchedBy: 'keyword' | 'category' | 'recommendation' | 'mock';
};
