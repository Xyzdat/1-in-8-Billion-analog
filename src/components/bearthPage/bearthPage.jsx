
import styles from './bearthPage.module.scss';
import ReactCountryFlag from 'react-country-flag';

<ReactCountryFlag
  countryCode="CA"
  svg
  style={{
    width: '24px',
    height: '18px',
  }}
/>

function BirthplacePage() {
  return (
    <main className={styles.birthplace}>
      <div className={styles.birthplace__content}>
        <div className={styles.birthplace__flag}>
          <ReactCountryFlag countryCode="JP" svg />
        </div>

        <p className={styles.birthplace__label}>
          ОПРЕДЕЛЯЕТСЯ МЕСТО РОЖДЕНИЯ
        </p>

        <h1 className={styles.birthplace__country}>
          Япония
        </h1>

        <div className={styles.birthplace__chance}>
          <span>Шанс родиться:</span>
          <strong>1 из 1400</strong>
        </div>
      </div>
    </main>
  );
}

export default BirthplacePage;
