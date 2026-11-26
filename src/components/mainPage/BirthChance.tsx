import { useEffect, useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import {
  birthChanceCountries,
  BIRTH_CHANCE_FADE_MS,
  BIRTH_CHANCE_INTERVAL_MS,
  formatBirthChance,
} from '../../game/birthChance';
import chanceBackground from '../../assets/figma-chance-bg.svg';
import chanceOutline from '../../assets/figma-chance-outline.svg';
import chanceHighlight from '../../assets/figma-chance-highlight.svg';
import styles from './BirthChance.module.scss';

export default function BirthChance() {
  const [index, setIndex] = useState(() => birthChanceCountries.findIndex(({ iso2 }) => iso2 === 'CA'));
  const [leaving, setLeaving] = useState(false);
  const country = birthChanceCountries[index];

  useEffect(() => {
    let transition: ReturnType<typeof setTimeout> | undefined;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setLeaving(true);
      transition = setTimeout(() => {
        setIndex((previous) => (previous + 1) % birthChanceCountries.length);
        setLeaving(false);
      }, BIRTH_CHANCE_FADE_MS);
    }, BIRTH_CHANCE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      clearTimeout(transition);
    };
  }, []);

  return (
    <section className={styles.birthChance} aria-label="Шанс места рождения">
      <img className={styles.birthChance__background} src={chanceBackground} alt="" />
      <div
        className={`${styles.birthChance__content}${leaving ? ` ${styles['birthChance__content--leaving']}` : ''}`}
      >
        <div className={styles.birthChance__info}>
          <span className={styles.birthChance__label}>ШАНС РОДИТЬСЯ В</span>
          <div className={styles.birthChance__country}>
            <ReactCountryFlag
              countryCode={country.iso2}
              svg
              className={styles.birthChance__flag}
              aria-label={`Флаг: ${country.name}`}
            />
            <span title={country.name}>{country.name}</span>
          </div>
        </div>
        <div className={styles.birthChance__value}>
          <img src={chanceOutline} alt="" />
          <img src={chanceHighlight} alt="" />
          <span>ШАНС</span>
          <strong>{formatBirthChance(country.probability)}</strong>
        </div>
      </div>
    </section>
  );
}
