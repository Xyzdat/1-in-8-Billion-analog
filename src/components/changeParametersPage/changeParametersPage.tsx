
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Coins } from 'lucide-react';
import backIcon from '../../assets/parameters-back.svg';
import chevronIcon from '../../assets/parameters-chevron.svg';
import styles from './changeParametersPage.module.scss';

import { initialStats, initialSettings, account } from '../../mocks/mockData';
import type { CharacterSettings, CharacterStats, StatKey, SettingKey } from '../../types/character';
import ParameterModal from '../parameterModal/ParameterModal';
import type { Session } from '../../api/sessionTypes';
import { birthFamilyPresets, canCustomizeBirth, canEditCharacterField } from '../../api/characterCustomization';
import { supportedCountries } from '../../data/supportedCountries';
import { parameterFields } from '../../mocks/parameterOptions';

type ChangeParametersPageProps = {
  onBack: () => void;
  onApply: () => void;
  values?: CharacterSettings;
  statValues?: Partial<CharacterStats>;
  onSave?: (settings: CharacterSettings, stats: CharacterStats) => void;
  server?: {
    session: Session;
    busy: boolean;
    failure: { message: string; retry?: () => void } | null;
    notice: string;
    onSave: (settings: CharacterSettings, stats: Partial<CharacterStats>) => void;
  };
};


function ChangeParametersPage({
  onBack,
  onApply,
  values = initialSettings,
  statValues = initialStats,
  onSave,
  server,
}: ChangeParametersPageProps) {
  const [stats, setStats] = useState(statValues);
  const [settings, setSettings] = useState(values);
  const [activeField, setActiveField] = useState<SettingKey | null>(null);
  const locked = Boolean(server?.busy || server?.failure?.retry || server?.session.state.status === 'COMPLETE');
  const birthEditable = server ? canCustomizeBirth(server.session) : false;
  const canEditField = (key: SettingKey) => !server || canEditCharacterField(server.session, key, settings);
  const canEditStat = (key: StatKey) => !server || server.session.provider === 'local' || key === 'appearance';
  const modalOptions = activeField === 'country' && server
    ? supportedCountries.map(({ name, iso2, group }) => ({
      label: name,
      icon: String.fromCodePoint(...[...iso2].map((letter) => letter.charCodeAt(0) + 127397)),
      group,
    }))
    : activeField === 'family' && server
      ? Object.keys(birthFamilyPresets).map((label) => ({ label }))
      : activeField === 'father' && server
        ? parameterFields.father.options.filter(({ label }) => label !== 'Случайно')
        : undefined;

  const changedCount =
    (Object.keys(stats) as StatKey[]).filter(key => stats[key] !== statValues[key]).length +
    (Object.keys(settings) as SettingKey[]).filter(
      key => settings[key] !== values[key],
    ).length;

  const updateStat = (key: StatKey, value: string) => {
    setStats(prev => ({ ...prev, [key]: Number(value) }));
  };

  const resetChanges = () => {
    setStats(statValues);
    setSettings(values);
  };

  const renderRow = (label: string, key: SettingKey) => (
    <button
      type="button"
      className={styles.parameters__row}
      key={key}
      onClick={() => setActiveField(key)}
      disabled={locked || !canEditField(key)}
    >
      <span>{label}</span>
      <strong>{settings[key] || (server ? 'Нет данных' : 'Не выбрано')}</strong>
      {canEditField(key) && <img src={chevronIcon} alt="" />}
    </button>
  );

  const renderSlider = (icon: string, label: string, key: StatKey) => (
    <div className={styles.parameters__stat} key={key}>
      <div className={styles.parameters__statInfo}>
        <span>{icon} {label}</span>
        <strong>{stats[key] === undefined ? 'Нет данных' : `${stats[key]} из 100`}</strong>
      </div>
      {stats[key] !== undefined && (
        <input
          className={styles.parameters__slider}
          type="range"
          min="0"
          max="100"
          value={stats[key]}
          disabled={locked || !canEditStat(key)}
          onChange={event => updateStat(key, event.target.value)}
          aria-label={label}
          style={{
            '--progress': `${stats[key]}%`,
          } as CSSProperties}
        />
      )}
      {stats[key] === undefined && canEditStat(key) && (
        <button
          type="button"
          className={styles.parameters__resetButton}
          disabled={locked}
          onClick={() => setStats((previous) => ({ ...previous, [key]: 50 }))}
        >
          Задать {label.toLocaleLowerCase('ru')}
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.parameters}>
      <header className={styles.parameters__header}>
        <button
          className={styles.parameters__backButton}
          onClick={onBack}
          disabled={Boolean(server?.busy)}
          aria-label="Вернуться к персонажу"
        >
          <img src={backIcon} alt="" />
        </button>

        <h1>Поменять параметры</h1>

        {!server && (
          <div className={styles.parameters__balance}>
            <Coins size={16} />
            <span>{account.tokenBalance}</span>
          </div>
        )}
      </header>

      <main className={styles.parameters__content}>
        <div className={styles.parameters__notice}>
          <span className={styles.parameters__noticeIcon}>
            <span aria-hidden="true">🎛</span>
          </span>
          <p>
            {server
              ? server.session.provider === '1in8b'
                ? 'Можно изменить имя и внешность. Остальные параметры доступны только для просмотра.'
                : birthEditable
                  ? 'До начала жизни можно изменить персонажа, место рождения и семью. Домашние животные доступны только для просмотра.'
                  : 'Можно изменить имя, здоровье, интеллект и внешность. Настройки рождения заблокированы после начала жизни.'
              : 'Измени любой параметр рождения — каждый стоит токены. Всё, что не трогаешь, останется случайным.'}
          </p>
        </div>

        <section className={styles.parameters__card}>
          <h2>Персонаж</h2>

          {renderRow('Имя', 'name')}
          {renderRow('Пол', 'gender')}

          <div className={styles.parameters__sectionDivider} />

          <h2>Характеристики</h2>
          {!server && (
            <p className={styles.parameters__description}>
              У вашего персонажа есть 200 очков,
              распределите их как пожелаете.
            </p>
          )}

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
            {!server && (
              <strong>
                Итого <Coins size={16} /> {account.parameterChangeTotal}
              </strong>
            )}
          </div>

          {server?.notice && <p role="status">{server.notice}</p>}
          {server?.failure && (
            <div>
              <p role="alert">{server.failure.message}</p>
              {server.failure.retry && (
                <button
                  type="button"
                  className={styles.parameters__resetButton}
                  onClick={server.failure.retry}
                  disabled={server.busy}
                >
                  Повторить сохранение
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            className={styles.parameters__applyButton}
            disabled={Boolean(server) && (locked || changedCount === 0)}
            onClick={() => {
              if (server) {
                server.onSave(settings, stats);
                return;
              }
              if (stats.health === undefined || stats.intelligence === undefined || stats.appearance === undefined) {
                return;
              }
              onSave?.(settings, {
                health: stats.health,
                intelligence: stats.intelligence,
                appearance: stats.appearance,
              });
              onApply();
            }}
          >
            {server?.busy ? 'Сохранение…' : 'Применить'}
          </button>

          <button
            type="button"
            className={styles.parameters__resetButton}
            onClick={resetChanges}
            disabled={locked}
          >
            Сбросить изменения
          </button>
        </section>
      </main>
      {activeField && canEditField(activeField) && (
        <ParameterModal
          key={activeField}
          field={activeField}
          value={settings[activeField]}
          country={settings.country}
          region={settings.region}
          showPrice={!server}
          options={modalOptions}
          allowCustomValue={Boolean(server) && (activeField === 'region' || activeField === 'city')}
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
