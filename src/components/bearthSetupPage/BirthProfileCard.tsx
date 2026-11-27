import ReactCountryFlag from 'react-country-flag';
import femaleIcon from '../../assets/setup-female.svg';
import type { BirthCardModel } from '../../types/birthCard';
import styles from './bearthSetupPage.module.scss';
import {Mars, Venus} from 'lucide-react'

export default function BirthProfileCard({ model }: { model: BirthCardModel }) {
  const facts = [
    { icon: '📅', value: model.birthYear, label: 'Год рождения' },
    { icon: '💰', value: model.wealth, label: 'Достаток семьи', context: model.wealthContext },
    { icon: '🎲', value: model.birthChance, label: 'Шанс родиться', context: model.birthChanceContext },
  ];

  return (
    <section className={`${styles.birthSetup__card} ${styles.birthSetup__profileCard}`}>
      <div className={styles.birthSetup__flag} role="img" aria-label={`Флаг: ${model.country}`}>
        <ReactCountryFlag countryCode={model.countryCode} svg />
      </div>

      <h2>
        <span>Ты {model.name}</span>
        {model.gender === 'Женщина' ? (
          // <img className={styles.birthSetup__gender} src={femaleIcon} alt="Женский пол" />
          <span className={styles.birthSetup__gender} aria-label="Женский пол"> <Venus/> </span>
        ) : model.gender === 'Мужчина' ? (
          <span className={styles.birthSetup__genderMan} aria-label="Мужской пол"> <Mars/> </span>
        ) : null}
      </h2>

      <p className={styles.birthSetup__location}>
        {[model.country, model.city].filter(Boolean).join(', ')}
      </p>
      <p className={styles.birthSetup__region}>
        Регион: {model.region || 'Нет данных'}
      </p>

      <div className={styles.birthSetup__birthStats}>
        {facts.map(({ icon, value, label, context }) => (
          <div className={styles.birthSetup__stat} key={label}>
            <span className={styles.birthSetup__statIcon} aria-hidden="true">{icon}</span>
            <strong>{label}</strong>
            <span title={context}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
