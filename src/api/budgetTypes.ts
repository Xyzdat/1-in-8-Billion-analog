import type { VersionedAction } from './sessionTypes.ts';

export type BudgetAction = 'APPLY_JOB' | 'REQUEST_RAISE' | 'QUIT_JOB'
  | 'TAKE_SIDE_JOB' | 'QUIT_SIDE_JOB' | 'OPEN_BUSINESS' | 'SET_STRATEGY' | 'SELL_ASSET';

export type BudgetActionRequest = VersionedAction & {
  action: BudgetAction;
  optionId: string;
};

export type BudgetOutcome = {
  status: 'APPLIED' | 'DECLINED';
  code: string;
  message: string;
  month: number;
  currency: 'RUB';
  periodMonths: number | null;
  amounts: Record<string, number>;
};

export type BudgetLine = { id: string; title: string; amount: number };

export type BudgetEmployment = {
  id: string;
  title: string;
  status: string;
  basePay: number;
  periodMonths: 1;
  hoursPerWeek: number | null;
  schedule: string | null;
  currentTenureMonths: number;
  totalExperienceMonths: number;
  workCapacityPercent: number;
  expectedPay: number | null;
  actualIncome: number | null;
  actualPeriodMonths: 12;
};

export type BudgetBusinessResult = {
  id: string;
  title: string;
  revenue: number | null;
  costs: number | null;
  net: number | null;
  grossBreakdownKnown: boolean;
};

export type BudgetStorage = {
  selectedId: string;
  amount: number;
  actualReturn: number;
  basis: string;
};

export type BudgetIncome = {
  total: number;
  monthlyAverage: number;
  sources: BudgetLine[];
  primary: BudgetEmployment | null;
  secondary: BudgetEmployment | null;
  business: BudgetBusinessResult | null;
  storage: BudgetStorage;
};

export type BudgetForecast = {
  months: 2;
  balance: number;
  available: number;
  expectedIncome: number;
  requiredPayments: number;
  projectedBalance: number;
  deficit: number;
  assumption: string;
};

export type BudgetObligation = {
  id: string;
  title: string;
  type: string;
  principal: number;
  annualBasisPoints: number;
  nextMonthlyInterest: number;
  plannedPrincipalPayment: number;
  scheduledMonthsRemaining: number | null;
  assetId: string | null;
};

export type BudgetExpenses = {
  total: number;
  monthlyAverage: number;
  categories: BudgetLine[];
  obligations: BudgetObligation[];
  forecast: BudgetForecast;
};

export type BudgetAvailability = { available: boolean; reason: string | null };

export type BudgetJobOffer = BudgetAvailability & {
  id: string;
  title: string;
  basePay: number;
  periodMonths: 1;
  hoursPerWeek: number;
  schedule: string;
  education: string;
  minQualification: number;
  minExperienceMonths: number;
  noExperience: boolean;
  experienceMatch: boolean;
};

export type BudgetRaiseOffer = BudgetAvailability & {
  id: 'results' | 'tenure' | 'responsibility';
  currentPay: number;
  proposedPay: number;
  extraHours: number;
  guaranteed: false;
};

export type BudgetJobs = {
  offers: BudgetJobOffer[];
  raiseGrounds: BudgetRaiseOffer[];
  current: BudgetEmployment | null;
  canQuit: boolean;
  quitReason: string | null;
};

export type BudgetBusinessOffer = BudgetAvailability & {
  id: string;
  title: string;
  investment: number;
  currentNetTarget: number;
  periodMonths: 1;
  risk: number;
  expectation: string;
};

export type BudgetBusinesses = {
  offers: BudgetBusinessOffer[];
  current: BudgetBusinessResult | null;
  compatibility: string;
};

export type BudgetStrategyId = 'cash' | 'deposit' | 'bonds' | 'balanced-fund'
  | 'equity-fund' | 'world-index' | 'trading';

export type BudgetStrategyOffer = BudgetAvailability & {
  id: BudgetStrategyId;
  title: string;
  description: string;
  risk: string;
  annualBasisPoints: number | null;
};

export type BudgetStrategies = {
  selectedId: string;
  options: BudgetStrategyOffer[];
  current: BudgetStorage;
};

export type BudgetAsset = BudgetAvailability & {
  id: string;
  title: string;
  kind: string;
  ownershipPercent: number;
  salePrice: number;
  debtIds: string[];
};

export type BudgetSaleRecord = {
  assetId: string;
  title: string;
  month: number;
  proceeds: number;
  debtRepaid: number;
  net: number;
};

export type BudgetAssets = { assets: BudgetAsset[]; sales: BudgetSaleRecord[] };

export type BudgetSalePreview = BudgetAvailability & {
  assetId: string;
  title: string;
  salePrice: number;
  debtPayoff: number;
  net: number;
  balanceAfterSale: number;
  obligationIds: string[];
  yearlyUpkeepStopped: number;
  rentalIncomeStopped: number | null;
  rentalModelled: boolean;
  forecast: BudgetForecast | null;
  priceRule: string;
};

export type BudgetDataMap = {
  income: BudgetIncome;
  expenses: BudgetExpenses;
  jobs: BudgetJobs;
  'side-jobs': BudgetJobs;
  businesses: BudgetBusinesses;
  strategies: BudgetStrategies;
  assets: BudgetAssets;
};

export type BudgetSection = keyof BudgetDataMap;

export type BudgetPage<T> = BudgetAvailability & {
  version: number;
  currency: 'RUB' | null;
  periodMonths: 12 | null;
  data: T | null;
};
