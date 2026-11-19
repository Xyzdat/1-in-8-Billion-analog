
import styles from './MainPage.module.scss';

const lives = [
  {
    id: 1,
    title: 'Луиза Браун',
    years: '1970 – 2046',
    description: 'Писательница и гениальная художница',
    image: '/images/life-1.jpg',
  },
  {
    id: 2,
    title: 'Женнева Джули',
    years: '1990 – 2096',
    description: 'Встречается с принцессой из окружения семьи и 4 внуков',
    image: '/images/life-2.jpg',
  },
  {
    id: 3,
    title: 'Жак',
    years: '1944 – 2080',
    description: 'Станет известным во всём мире',
    image: '/images/life-3.jpg',
  },
];

const navigation = [
  { id: 1, icon: '☷', label: 'Главная' },
  { id: 2, icon: '▣', label: 'Истории' },
  { id: 3, icon: '♥', label: 'Избранное' },
  { id: 4, icon: '▤', label: 'Записи' },
  { id: 5, icon: '●', label: 'Профиль' },
];

function MainPage() {
  return (
    <main className={styles.mainPage}>
      <header className={styles.mainPage__header}>
        <button
          className={styles.mainPage__menu}
          aria-label="Открыть меню"
        >
          <span />
          <span />
          <span />
        </button>

        <h1 className={styles.mainPage__headerTitle}>
          Жизнь без конца
        </h1>

        <button
          className={styles.mainPage__share}
          aria-label="Поделиться"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M12 16V3m-5 5 5-5 5 5" />
            <path d="M5 12v8h14v-8" />
          </svg>
        </button>
      </header>

      <section className={styles.mainPage__hero}>
        <img
          className={styles.mainPage__heroImage}
          src="/images/hero-winter.jpg"
          alt="Заснеженная зимняя улица"
        />
      </section>

      <div className={styles.mainPage__content}>
        <section className={styles.mainPage__intro}>
          <h2 className={styles.mainPage__title}>
            Жизнь без конца
          </h2>

          <p className={styles.mainPage__description}>
            Ты рождаешься в случайной стране, семье
            и эпохе и проживаешь целую жизнь. Где учиться,
            с кем сблизиться, остаться дома или уехать —
            твои решения меняют ход истории.
          </p>
        </section>

        <section className={styles.mainPage__chance}>
          <div className={styles.mainPage__chanceInfo}>
            <span className={styles.mainPage__chanceLabel}>
              ШАНС РОДИТЬСЯ В
            </span>

            <div className={styles.mainPage__country}>
              <span className={styles.mainPage__flag}>🇨🇦</span>
              <span>Канада, Оттава</span>
            </div>
          </div>

          <div className={styles.mainPage__chanceValue}>
            <span>ШАНС</span>
            <strong>1 ИЗ 1400</strong>
          </div>
        </section>

        <div className={styles.mainPage__separator} />

        <button className={styles.mainPage__start}>
          <span className={styles.mainPage__startIcon}>🎲</span>
          <span>Старт</span>
        </button>

        <section className={styles.mainPage__lives}>
          <h3 className={styles.mainPage__sectionTitle}>
            Параллельные жизни
          </h3>

          <div className={styles.mainPage__livesList}>
            {lives.map((life) => (
              <article className={styles.lifeCard} key={life.id}>
                <img
                  className={styles.lifeCard__image}
                  src={life.image}
                  alt={life.title}
                />

                <h4 className={styles.lifeCard__title}>
                  {life.title}
                </h4>

                <span className={styles.lifeCard__years}>
                  {life.years}
                </span>

                <p className={styles.lifeCard__description}>
                  {life.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <nav className={styles.mainPage__navigation}>
        {navigation.map((item, index) => (
          <button
            className={`${styles.mainPage__navigationItem} ${
              index === 0
                ? styles.mainPage__navigationItemActive
                : ''
            }`}
            key={item.id}
            aria-label={item.label}
          >
            <span className={styles.mainPage__navigationIcon}>
              {item.icon}
            </span>
          </button>
        ))}
      </nav>
    </main>
  );
}

export default MainPage;
