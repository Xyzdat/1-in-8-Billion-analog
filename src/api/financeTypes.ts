import type { SessionStats, VersionedAction } from './sessionTypes.ts';

export type SpendingCurrency = 'RUB' | 'PPP_USD';
export type SpendingCategoryId = 'relationships' | 'property' | 'health' | 'hobby'
  | 'appearance' | 'pets' | 'education' | 'city' | 'country' | 'provider';

export type FinanceVersion = {
  version: number;
  age: number;
  currency: SpendingCurrency;
};

export type SpendingLocation = {
  countryCode: string;
  country: string;
  city: string | null;
};

export type SpendingEffects = {
  health?: number | null;
  happiness?: number | null;
  intelligence?: number | null;
  relationships?: number | null;
  appearance?: number | null;
};

export type SpendingOffer = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  price: number;
  yearlyCost: number | null;
  durationMonths: number | null;
  minAge: number | null;
  effects: SpendingEffects | null;
  location: SpendingLocation | null;
  purchasable: boolean;
  unavailableReason: string | null;
  balanceAfterPurchase: number | null;
};

export type SpendingCategory = {
  id: SpendingCategoryId;
  groupId: string;
  groupTitle: string;
  title: string;
  actionTitle: string | null;
  description: string | null;
  icon: string | null;
  minAge: number | null;
  priceFrom: number | null;
  actions: SpendingOffer[];
};

export type FinanceSummary = {
  income: number | null;
  expenses: number | null;
  periodMonths: number | null;
  savings: number | null;
  debt: number | null;
  availableBalance: number | null;
  netWorth: number | null;
  occupation: string | null;
  depositRateBasisPoints: number | null;
  asOfAge: number | null;
};

export type FinanceTransaction = {
  flow?: 'OPERATING' | 'FINANCING' | null;
  id: string;
  month: number;
  kind: 'BUDGET' | 'PURCHASE' | 'UPKEEP' | 'INTEREST';
  title: string;
  income: number;
  expense: number;
};

export type PurchasedItem = {
  id: string;
  month: number;
  categoryId: string;
  itemId: string;
  title: string;
  icon: string | null;
  price: number;
  yearlyCost: number | null;
  durationMonths: number | null;
  petName: string | null;
  status: 'PURCHASED' | 'IN_PROGRESS' | 'COMPLETED';
  location: SpendingLocation | null;
};

export type Finances = FinanceVersion & {
  summary: FinanceSummary;
  ledger: FinanceTransaction[] | null;
  purchases: PurchasedItem[] | null;
  categories: SpendingCategory[];
  location: SpendingLocation | null;
};

export type SpendingShop = FinanceVersion & {
  category: SpendingCategory;
  heading: string;
  description: string;
  confirmLabel: string | null;
  availableBalance: number | null;
  stats: SessionStats;
  suggestedPetNames: string[];
  offers: SpendingOffer[];
};

export type BuySpendingItemRequest = VersionedAction & {
  categoryId: string;
  itemId: string;
  petName?: string | null;
};
