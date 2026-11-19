import styles from './mainPage.module.scss';
import headerImage from '../../assets/image1.png';
import ReactCountryFlag from 'react-country-flag';
import {Dices} from 'lucide-react';
import luisa from '../../assets/луиза.png'
import janklo from '../../assets/жанкло.png'
import jeneva from '../../assets/женева.png'
import CustomScrollbar from '../customScrollbar/customScrollbar';
import { useRef } from 'react';

<ReactCountryFlag
  countryCode="CA"
  svg
  style={{
    width: '24px',
    height: '18px',
  }}
/>

const lives = [
  {
    id: 1,
    title: 'Луиза Браун',
    years: '1970 – 2046',
    description: 'Писательница и гениальная художница',
    image: luisa,
  },
  {
    id: 2,
    title: 'Женнева Джули',
    years: '1990 – 2096',
    description: 'Встречается с принцессой из окружения семьи и 4 внуков',
    image: jeneva,
  },
  {
    id: 3,
    title: 'Жак',
    years: '1944 – 2080',
    description: 'Станет известным во всём мире',
    image: janklo,
  },
];



function MainPage({ onStart }) {
  const scrollContainerRef = useRef(null);

  return (
    <div className={styles.mainPageWrapper}> 
      <main className={styles.mainPage}
            ref={scrollContainerRef}
      >
        <section className={styles.mainPage__hero}>
          <img
            className={styles.mainPage__heroImage}
            src={headerImage}
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
                <span className={styles.mainPage__flag}><ReactCountryFlag countryCode="CA" svg /></span>
                <span>Канада, Оттава</span>
              </div>
            </div>

            <div className={styles.mainPage__chanceValue}>
              <span>ШАНС</span>
              <strong>1 ИЗ 1400</strong>
            </div>
          </section>

          <div className={styles.mainPage__separator} />

          <button className={styles.mainPage__start}
                  onClick={onStart}
          >
            <span className={styles.mainPage__startIcon}><Dices /></span>
            <span className={styles.mainPage__startTitle}>Старт</span>
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
      </main>

      <CustomScrollbar
        scrollContainerRef={scrollContainerRef}
      />
    </div>
    
  );
}

export default MainPage;
