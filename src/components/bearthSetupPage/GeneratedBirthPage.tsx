import type { Session } from '../../api/sessionTypes';
import { toGeneratedBirthCard } from '../../api/birthDetailsMapper';
import BirthCharacterPage from './BirthCharacterPage';

type GeneratedBirthPageProps = {
  session: Session;
  onStartLife: () => void;
  onShowParameters: () => void;
};

export default function GeneratedBirthPage({ session, onStartLife, onShowParameters }: GeneratedBirthPageProps) {
  return (
    <BirthCharacterPage
      model={toGeneratedBirthCard(session)}
      onStartLife={onStartLife}
      onChangeParameters={onShowParameters}
      engineCredit={session.provider === '1in8b'}
    />
  );
}
