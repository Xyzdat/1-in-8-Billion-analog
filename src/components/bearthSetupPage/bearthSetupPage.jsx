import styles from './bearthSetupPage.module.scss';
import ReactCountryFlag from 'react-country-flag';

const character = {
  name: 'Юи Ватанабе',
  gender: '♀',
  country: 'Япония',
  city: 'Кобе',
  region: 'префектура Хёго',
  birthYear: '2026',
  familyWealth: 'Скромный',
  birthChance: '1 из 1400',
};

const characteristics = [
  { icon: '❤️', name: 'Здоровье', value: 91 },
  { icon: '🧠', name: 'Интеллект', value: 72 },
  { icon: '🔥', name: 'Внешность', value: 64 },
];

const family = [
  {
    icon: '👩',
    name: 'Мама – Акико, 29 лет',
    description: 'Медсестра. Заботливая и терпеливая.',
  },
  {
    icon: '👨',
    name: 'Папа – Кэнта, 32 года',
    description: 'Автомеханик. Спокойный и требовательный.',
  },
  {
    icon: '👶',
    name: 'Брат – Хару, 5 лет',
    description: 'Ходит в садик. Любит рисовать',
  },
  {
    icon: '👶',
    name: 'Брат – Хару, 5 лет',
    description: 'Ходит в садик. Любит рисовать',
  },
];

const familyDetails = [
  ['Жильё', 'Съёмная квартира'],
  ['Достаток', 'Скромный, стабильный доход'],
  ['Отношения в семье', 'Тёплые и крепкие'],
  ['Вера семьи', 'Буддизм'],
  ['Язык в семье', 'Японский'],
];

const countryDetails = [
  ['⛩️', 'Религии страны', 'Синтоизм и буддизм'],
  ['💸', 'ВВП на душу населения', '$55,419'],
  ['💱', 'Валюта', 'Иена'],
];

<ReactCountryFlag
  countryCode="CA"
  svg
  style={{
    width: '24px',
    height: '18px',
  }}
/>

function BirthSetupPage({ onStartLife, onChangeParameters }) {
  return (
    <div className={styles.page}>
      <main className={styles.content}>
        {/* Персонаж */}
        <section className={`${styles.card} ${styles.profileCard}`}>
          <div className={styles.flag}><ReactCountryFlag countryCode="JP" svg /></div>

          <h2>
            Ты {character.name}
            <span className={styles.gender}>{character.gender}</span>
          </h2>

          <p className={styles.location}>
            {character.country}, {character.city}
          </p>

          <p className={styles.region}>
            Регион: {character.region}
          </p>

          <div className={styles.birthStats}>
            <div className={styles.stat}>
              <span className={styles.statIcon}>📅</span>
              <strong>{character.birthYear}</strong>
              <span>год рождения</span>
            </div>

            <div className={styles.stat}>
              <span className={styles.statIcon}>💰</span>
              <strong>{character.familyWealth}</strong>
              <span>остаток семьи</span>
            </div>

            <div className={styles.stat}>
              <span className={styles.statIcon}>🎲</span>
              <strong>{character.birthChance}</strong>
              <span>шанс родиться</span>
            </div>
          </div>
        </section>

        {/* Характеристики */}
        <section className={styles.card}>
          <h3>О тебе</h3>

          <div className={styles.characteristics}>
            {characteristics.map((item) => (
              <div className={styles.characteristic} key={item.name}>
                <span className={styles.characteristicIcon}>
                  {item.icon}
                </span>

                <div className={styles.characteristicInfo}>
                  <div className={styles.characteristicHeading}>
                    <span>{item.name}</span>
                    <span>{item.value} из 100</span>
                  </div>

                  <div className={styles.progress}>
                    <div
                      className={styles.progressValue}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className={styles.hint}>
            Показатели будут меняться в течение жизни.
          </p>
        </section>

        {/* Семья */}
        <section className={styles.card}>
          <h3>Твоя семья</h3>

          <div className={styles.familyList}>
            {family.map((member, index) => (
              <div className={styles.familyMember} key={`${member.name}-${index}`}>
                <span className={styles.familyIcon}>{member.icon}</span>

                <div className={styles.familyInfo}>
                  <strong>{member.name}</strong>
                  <span>{member.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.familyDetails}>
            {familyDetails.map(([label, value]) => (
              <div className={styles.detailRow} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Страна */}
        <section className={styles.card}>
          <h3>О стране · {character.country}</h3>

          <div className={styles.map}>
            <span className={styles.mapDot}>●</span>
          </div>

          <div className={styles.countryDetails}>
            {countryDetails.map(([icon, label, value]) => (
              <div className={styles.detailRow} key={label}>
                <span className={styles.countryLabel}>
                  <span>{icon}</span>
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className={styles.countryStats}>
            <div className={styles.countryStat}>
              <span className={styles.statIcon}>🕒</span>
              <strong>69 лет</strong>
              <span>ожидаемая продолжительность жизни</span>
            </div>

            <div className={styles.countryStat}>
              <span className={styles.statIcon}>🕊️</span>
              <strong>5.3%</strong>
              <span>вероятность смерти в возрасте до 5 лет</span>
            </div>
          </div>
        </section>

        {/* Правила */}
        <section className={styles.card}>
          <h3>Как играть</h3>

          <ol className={styles.rules}>
            <li>Время идёт само по себе</li>
            <li>Выбирай действия. Решения влияют на всю жизнь.</li>
            <li>Следи за состоянием персонажа.</li>
          </ol>
        </section>

        {/* Действия */}
        <div className={styles.actions}>
          <button
            className={styles.startButton}
            onClick={onStartLife}
          >
            Начать жизнь
          </button>

          <button
            className={styles.changeButton}
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