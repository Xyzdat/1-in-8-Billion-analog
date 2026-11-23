import clockIcon from '../../assets/setup-clock.png';
import doveIcon from '../../assets/setup-dove.png';
import type { BirthCardModel } from '../../types/birthCard';
import styles from './bearthSetupPage.module.scss';
import BirthplaceMap from './BirthplaceMap';
import { Globe, BookOpen } from 'lucide-react';

export default function BirthCountryCard({ model }: { model: BirthCardModel }) {
  const stats = [
    { icon: clockIcon, value: model.lifeExpectancy, label: 'ожидаемая продолжительность жизни' },
    { icon: doveIcon, value: model.childMortality, label: 'вероятность смерти в возрасте до 5 лет' },
  ];
  const icons = [
    <BookOpen
      className={styles.birthSetup__countryGlyph}
      strokeWidth={1.8}
    />,
    '💸',
    model.countryCode === 'JP' ? '¥' : '💱',
  ];

  return (
    <section className={`${styles.birthSetup__card} ${styles['birthSetup__card--country']}`}>
      <h3>О стране · {model.country}</h3>

      <BirthplaceMap
        key={`${model.countryCode}:${model.city}`}
        location={{ countryCode: model.countryCode, country: model.country, city: model.city }}
      />

      <div className={styles.birthSetup__countryDetails}>
        {model.countryDetails.map(({ label, value }, index) => (
          <div className={styles.birthSetup__detailRow} key={label}>
            <span className={styles.birthSetup__countryLabel}>
              <span className={styles.birthSetup__countryIcon} aria-hidden="true">{icons[index]}</span>
              {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className={styles.birthSetup__countryStats}>
        {stats.map(({ icon, value, label }) => (
          <div className={styles.birthSetup__countryStat} key={label}>
            <span className={styles.birthSetup__statIcon}>
              <img src={icon} alt="" />
            </span>
            <strong>{label}</strong>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
