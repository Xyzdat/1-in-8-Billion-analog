import type { BirthCardModel } from '../../types/birthCard';
import heartIcon from '../../assets/setup-heart.png';
import brainIcon from '../../assets/setup-brain.png';
import fireIcon from '../../assets/setup-fire.png';
import { gameRules } from '../../mocks/mockData';
import BirthProfileCard from './BirthProfileCard';
import BirthFamilyCard from './BirthFamilyCard';
import BirthCountryCard from './BirthCountryCard';
import EngineCredit from './EngineCredit';
import styles from './bearthSetupPage.module.scss';

type BirthCharacterPageProps = {
  model: BirthCardModel;
  onStartLife: () => void;
  onChangeParameters: () => void;
  busy?: boolean;
  failure?: { message: string; retry?: () => void } | null;
  engineCredit?: boolean;
};

export default function BirthCharacterPage({
  model,
  onStartLife,
  onChangeParameters,
  busy = false,
  failure = null,
  engineCredit = false,
}: BirthCharacterPageProps) {
  const locked = busy || Boolean(failure?.retry);
  const scores = [
    { icon: heartIcon, label: 'Здоровье', value: model.stats.health },
    { icon: brainIcon, label: 'Интеллект', value: model.stats.intelligence },
    { icon: fireIcon, label: 'Внешность', value: model.stats.appearance },
  ];

  return (
    <div className={styles.birthSetup}>
      <main className={styles.birthSetup__content}>
        <BirthProfileCard model={model} />

        <section className={`${styles.birthSetup__card} ${styles['birthSetup__card--stats']}`}>
          <h3>О тебе</h3>
          <div className={styles.birthSetup__characteristics}>
            {scores.map(({ icon, label, value }) => (
              <div className={styles.birthSetup__characteristic} key={label}>
                <span className={styles.birthSetup__characteristicIcon}>
                  <img src={icon} alt="" />
                </span>
                <div className={styles.birthSetup__characteristicInfo}>
                  <div className={styles.birthSetup__characteristicHeading}>
                    <span>{label}</span>
                    <span>{value === null ? 'Нет данных' : `${value} из 100`}</span>
                  </div>
                  {value !== null && (
                    <div
                      className={styles.birthSetup__progress}
                      role="meter"
                      aria-label={label}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={value}
                    >
                      <div
                        className={styles.birthSetup__progressValue}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className={styles.birthSetup__hint}>Показатели будут меняться в течение жизни.</p>
        </section>

        <BirthFamilyCard model={model} />
        <BirthCountryCard model={model} />

        <section className={`${styles.birthSetup__card} ${styles['birthSetup__card--rules']}`}>
          <h3>Как играть</h3>
          <ol className={styles.birthSetup__rules}>
            {gameRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>

        <div className={styles.birthSetup__actions}>
          {failure && (
            <div className={styles.birthSetup__startError}>
              <p role="alert">{failure.message}</p>
              {failure.retry && (
                <button
                  type="button"
                  className={styles.birthSetup__changeButton}
                  onClick={failure.retry}
                  disabled={busy}
                >
                  Повторить
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            className={styles.birthSetup__startButton}
            onClick={onStartLife}
            disabled={locked}
          >
            {busy ? 'Создаём жизнь…' : 'Начать жизнь'}
          </button>
          <button
            type="button"
            className={styles.birthSetup__changeButton}
            onClick={onChangeParameters}
            disabled={locked}
          >
            Поменять параметры
          </button>
        </div>
        {engineCredit && (
          <div className={styles.birthSetup__credit}>
            <EngineCredit />
          </div>
        )}
      </main>
    </div>
  );
}
