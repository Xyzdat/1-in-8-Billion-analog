// Модель интерфейса. Формат DTO backend согласуется отдельно через OpenAPI.
export type CharacterSettings = {
  name: string;
  gender: string;
  country: string;
  region: string;
  city: string;
  family: string;
  siblings: string;
  pets: string;
  housing: string;
  relationships: string;
  father: string;
  mother: string;
  wealth: string;
  religion: string;
  language: string;
};

export type CharacterStats = {
  health: number;
  intelligence: number;
  appearance: number;
};

export type StatKey = keyof CharacterStats;
export type SettingKey = keyof CharacterSettings;
