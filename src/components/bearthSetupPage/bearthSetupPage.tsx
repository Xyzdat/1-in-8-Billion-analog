import { initialSettings, initialStats } from '../../mocks/mockData';
import { toMockBirthCard } from '../../mocks/birthCard';
import type { CharacterSettings, CharacterStats } from '../../types/character';
import BirthCharacterPage from './BirthCharacterPage';

type BirthSetupPageProps = {
  onStartLife: () => void;
  onChangeParameters: () => void;
  settings?: CharacterSettings;
  stats?: CharacterStats;
  startBusy?: boolean;
  startFailure?: { message: string; retry?: () => void } | null;
};

export default function BirthSetupPage({
  onStartLife,
  onChangeParameters,
  settings = initialSettings,
  stats = initialStats,
  startBusy = false,
  startFailure = null,
}: BirthSetupPageProps) {
  return (
    <BirthCharacterPage
      model={toMockBirthCard(settings, stats)}
      onStartLife={onStartLife}
      onChangeParameters={onChangeParameters}
      busy={startBusy}
      failure={startFailure}
    />
  );
}
