import styles from './bearthSetupPage.module.scss';
import mapImage from '../../assets/setup-world-map.png';
import mapMarker from '../../assets/setup-map-marker.svg';
import femaleIcon from '../../assets/setup-female.svg';
import clockIcon from '../../assets/setup-clock.png';
import doveIcon from '../../assets/setup-dove.png';
import ReactCountryFlag from 'react-country-flag';

import { character, characteristics, family, familyDetails, country, gameRules } from '../../mocks/mockData';
import { initialSettings, initialStats } from '../../mocks/mockData';
import { countryCodes } from '../../mocks/parameterOptions';

type BirthSetupPageProps = {
  onStartLife: () => void;
  onChangeParameters: () => void;
  settings?: typeof initialSettings;
  stats?: typeof initialStats;
};

function BirthSetupPage({ onStartLife, onChangeParameters, settings = initialSettings, stats = initialStats }: BirthSetupPageProps) {
  const currentCharacter = {
    ...character,
    ...settings,
    familyWealth: settings.wealth,
    regionType: settings.country === character.country ? character.regionType : '',
    countryCode: countryCodes[settings.country] || character.countryCode,
  };
  const statValues = [stats.health, stats.intelligence, stats.appearance];
  const currentDetails = familyDetails.map(([label, value]) => [label,
    label === 'Жильё' ? settings.housing :
    label === 'Отношения в семье' ? settings.relationships :
    label === 'Достаток' ? settings.wealth :
    label === 'Вера семьи' ? settings.religion :
    label === 'Язык в семье' ? settings.language : value,
  ]);
  const parentMembers = family.slice(0, 2).filter((_, index) =>
    settings.family === 'Полная семья' ||
    (settings.family === 'Только мама' && index === 0) ||
    (settings.family === 'Только папа' && index === 1),
  ).map((member) => ({
    ...member,
    description: member.icon === '👩' ? settings.mother : settings.father,
  }));
  const extraDetails = [
    ['Состав семьи', settings.family],
    ['Братья и сёстры', settings.siblings],
    ['Домашние животные', settings.pets],
  ];
  return (
    <div className={styles.birthSetup}>
      <main className={styles.birthSetup__content}>
        {/* Персонаж */}
        <section className={`${styles.birthSetup__card} ${styles.birthSetup__profileCard}`}>
          <div className={styles.birthSetup__flag} role="img" aria-label={`Флаг: ${currentCharacter.country}`}>
            <ReactCountryFlag countryCode={currentCharacter.countryCode} svg />
          </div>

          <h2>
            Ты {currentCharacter.name}
            {settings.gender === 'Женщина'
              ? <img className={styles.birthSetup__gender} src={femaleIcon} alt="женский пол" />
              : <span aria-label="мужской пол">♂</span>}
          </h2>

          <p className={styles.birthSetup__location}>
            {[currentCharacter.country, currentCharacter.city].filter(Boolean).join(', ')}
          </p>

          <p className={styles.birthSetup__region}>
            Регион: {currentCharacter.region ? `${currentCharacter.regionType} ${currentCharacter.region}`.trim() : 'Не выбран'}
          </p>

          <div className={styles.birthSetup__birthStats}>
            <div className={styles.birthSetup__stat}>
              <span className={styles.birthSetup__statIcon}>📅</span>
              <strong>{currentCharacter.birthYear}</strong>
              <span>год рождения</span>
            </div>

            <div className={styles.birthSetup__stat}>
              <span className={styles.birthSetup__statIcon}>💰</span>
              <strong>{currentCharacter.familyWealth}</strong>
              <span>достаток семьи</span>
            </div>

            <div className={styles.birthSetup__stat}>
              <span className={styles.birthSetup__statIcon}>🎲</span>
              <strong>{currentCharacter.birthChance}</strong>
              <span>шанс родиться</span>
            </div>
          </div>
        </section>

        {/* Характеристики */}
        <section className={styles.birthSetup__card}>
          <h3>О тебе</h3>

          <div className={styles.birthSetup__characteristics}>
            {characteristics.map((source, index) => {
              const item = { ...source, value: statValues[index] };
              return (
              <div className={styles.birthSetup__characteristic} key={item.name}>
                <span className={styles.birthSetup__characteristicIcon}>
                  <img src={item.icon} alt="" />
                </span>

                <div className={styles.birthSetup__characteristicInfo}>
                  <div className={styles.birthSetup__characteristicHeading}>
                    <span>{item.name}</span>
                    <span>{item.value} из 100</span>
                  </div>

                  <div className={styles.birthSetup__progress}>
                    <div
                      className={styles.birthSetup__progressValue}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          <p className={styles.birthSetup__hint}>
            Показатели будут меняться в течение жизни.
          </p>
        </section>

        {/* Семья */}
        <section className={styles.birthSetup__card}>
          <h3>Твоя семья</h3>

          <div className={styles.birthSetup__familyList}>
            {parentMembers.map((member, index) => (
              <div className={styles.birthSetup__familyMember} key={`${member.name}-${index}`}>
                <span className={styles.birthSetup__familyIcon}>{member.icon}</span>

                <div className={styles.birthSetup__familyInfo}>
                  <strong>{member.name}</strong>
                  <span>{member.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.birthSetup__familyDetails}>
            {[...extraDetails, ...currentDetails].map(([label, value]) => (
              <div className={styles.birthSetup__detailRow} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Страна */}
        <section className={styles.birthSetup__card}>
          <h3>О стране · {currentCharacter.country}</h3>

          {settings.country === character.country && <div className={styles.birthSetup__map}>
            <img className={styles.birthSetup__mapImage} src={mapImage} alt="Точечная карта мира" />
            <img className={styles.birthSetup__mapDot} src={mapMarker} alt={`${country.name} на карте`} />
          </div>}

          <div className={styles.birthSetup__countryDetails}>
            {(settings.country === character.country ? country.details : []).map(([icon, label, value]) => (
              <div className={styles.birthSetup__detailRow} key={label}>
                <span className={styles.birthSetup__countryLabel}>
                  <span>{icon}</span>
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {settings.country === character.country ? <div className={styles.birthSetup__countryStats}>
            <div className={styles.birthSetup__countryStat}>
              <span className={styles.birthSetup__statIcon}><img src={clockIcon} alt="" /></span>
              <strong>{country.lifeExpectancy}</strong>
              <span>ожидаемая продолжительность жизни</span>
            </div>

            <div className={styles.birthSetup__countryStat}>
              <span className={styles.birthSetup__statIcon}><img src={doveIcon} alt="" /></span>
              <strong>{country.childMortality}</strong>
              <span>вероятность смерти в возрасте до 5 лет</span>
            </div>
          </div> : <p>Статистика страны пока не добавлена.</p>}
        </section>

        {/* Правила */}
        <section className={styles.birthSetup__card}>
          <h3>Как играть</h3>

          <ol className={styles.birthSetup__rules}>
            {gameRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>

        {/* Действия */}
        <div className={styles.birthSetup__actions}>
          <button
            className={styles.birthSetup__startButton}
            onClick={onStartLife}
          >
            Начать жизнь
          </button>

          <button
            className={styles.birthSetup__changeButton}
            onClick={onChangeParameters}
          >
            Поменять параметры
          </button>
        </div>
      </main>
    </div>
  );
}

export default BirthSetupPage;
