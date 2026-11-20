
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Coins } from 'lucide-react';
import backIcon from '../../assets/parameters-back.svg';
import chevronIcon from '../../assets/parameters-chevron.svg';
import styles from './changeParametersPage.module.scss';

import { initialStats, initialSettings, account } from '../../mocks/mockData';
import type { StatKey, SettingKey } from '../../mocks/mockData';
import ParameterModal from '../parameterModal/ParameterModal';

type ChangeParametersPageProps = {
  onBack: () => void;
  onApply: () => void;
  values?: typeof initialSettings;
  statValues?: typeof initialStats;
  onSave?: (settings: typeof initialSettings, stats: typeof initialStats) => void;
};


function ChangeParametersPage({ onBack, onApply, values = initialSettings, statValues = initialStats, onSave }: ChangeParametersPageProps) {
  const [stats, setStats] = useState(statValues);
  const [settings, setSettings] = useState(values);
  const [activeField, setActiveField] = useState<SettingKey | null>(null);

  const changedCount =
    (Object.keys(stats) as StatKey[]).filter(key => stats[key] !== initialStats[key]).length +
    (Object.keys(settings) as SettingKey[]).filter(
      key => settings[key] !== initialSettings[key],
    ).length;

  const updateStat = (key: StatKey, value: string) => {
    setStats(prev => ({ ...prev, [key]: Number(value) }));
  };

  const resetChanges = () => {
    setStats(initialStats);
    setSettings(initialSettings);
  };

  const renderRow = (label: string, key: SettingKey) => (
    <button
      type="button"
      className={styles.parameters__row}
      key={key}
      onClick={() => setActiveField(key)}
    >
      <span>{label}</span>
      <strong>{settings[key] || 'Не выбрано'}</strong>
      <img src={chevronIcon} alt="" />
    </button>
  );

  const renderSlider = (icon: string, label: string, key: StatKey) => (
    <div className={styles.parameters__stat} key={key}>
      <div className={styles.parameters__statInfo}>
        <span>{icon} {label}</span>
        <strong>{stats[key]} из 100</strong>
      </div>
      <input
        className={styles.parameters__slider}
        type="range"
        min="0"
        max="100"
        value={stats[key]}
        onChange={event => updateStat(key, event.target.value)}
        aria-label={label}
        style={{
          '--progress': `${stats[key]}%`,
        } as CSSProperties}
      />
    </div>
  );

  return (
    <div className={styles.parameters}>
      <header className={styles.parameters__header}>
        <button
          className={styles.parameters__backButton}
          onClick={onBack}
          aria-label="Вернуться к персонажу"
        >
          <img src={backIcon} alt="" />
        </button>

        <h1>Поменять параметры</h1>

        <div className={styles.parameters__balance}>
          <Coins size={16} />
          <span>{account.tokenBalance}</span>
        </div>
      </header>

      <main className={styles.parameters__content}>
        <div className={styles.parameters__notice}>
          <span className={styles.parameters__noticeIcon}>
            <span aria-hidden="true">🎛</span>
          </span>
          <p>
            Измени любой параметр рождения — каждый стоит токены.
            Всё, что не трогаешь, останется случайным.
          </p>
        </div>

        <section className={styles.parameters__card}>
          <h2>Персонаж</h2>

          {renderRow('Имя', 'name')}
          {renderRow('Пол', 'gender')}

          <div className={styles.parameters__sectionDivider} />

          <h2>Персонаж</h2>
          <p className={styles.parameters__description}>
            У вашего персонажа есть 200 очков,
            распределите их как пожелаете.
          </p>

          {renderSlider('🧠', 'Интеллект', 'intelligence')}
          {renderSlider('🔥', 'Внешность', 'appearance')}
          {renderSlider('❤️', 'Здоровье', 'health')}
        </section>

        <section className={styles.parameters__card}>
          <h2>Место рождения</h2>
          {renderRow('Страна', 'country')}
          {renderRow('Регион', 'region')}
          {renderRow('Город', 'city')}
        </section>

        <section className={styles.parameters__card}>
          <h2>Семья</h2>
          {renderRow('Состав семьи', 'family')}
          {renderRow('Братья и сёстры', 'siblings')}
          {renderRow('Домашние животные', 'pets')}
          {renderRow('Жильё', 'housing')}
          {renderRow('Отношения в семье', 'relationships')}
          {renderRow('Профессия отца', 'father')}
          {renderRow('Профессия матери', 'mother')}
          {renderRow('Достаток', 'wealth')}
          {renderRow('Религия', 'religion')}
          {renderRow('Язык в семье', 'language')}
        </section>

        <section className={styles.parameters__footerCard}>
          <div className={styles.parameters__footerInfo}>
            <span>Изменено параметров: {changedCount}</span>
            <strong>
              Итого <Coins size={16} /> {account.parameterChangeTotal}
            </strong>
          </div>

          <button className={styles.parameters__applyButton} onClick={() => {
            onSave?.(settings, stats);
            onApply();
          }}>
            Применить
          </button>

          <button className={styles.parameters__resetButton} onClick={resetChanges}>
            Сбросить изменения
          </button>
        </section>
      </main>
      {activeField && (
        <ParameterModal
          key={activeField}
          field={activeField}
          value={settings[activeField]}
          country={settings.country}
          region={settings.region}
          onClose={() => setActiveField(null)}
          onConfirm={(value) => {
            setSettings((previous) => ({
              ...previous,
              [activeField]: value,
              ...(activeField === 'country' && value !== previous.country ? { region: '', city: '' } : {}),
              ...(activeField === 'region' && value !== previous.region ? { city: '' } : {}),
            }));
            setActiveField(null);
          }}
        />
      )}
    </div>
  );
}

export default ChangeParametersPage;
