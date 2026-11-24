export type BirthCardDetail = {
  label: string;
  value: string;
  context?: string;
};

export type BirthCardMember = {
  id: string;
  kind: 'mother' | 'father' | 'sibling';
  title: string;
  description: string;
  context?: string;
};

export type BirthCardModel = {
  name: string;
  gender: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  birthYear: string;
  wealth: string;
  wealthContext?: string;
  birthChance: string;
  birthChanceContext?: string;
  stats: {
    health: number | null;
    intelligence: number | null;
    appearance: number | null;
  };
  members: BirthCardMember[];
  familyDetails: BirthCardDetail[];
  countryDetails: BirthCardDetail[];
  lifeExpectancy: string;
  lifeExpectancyContext?: string;
  childMortality: string;
  childMortalityContext?: string;
};
