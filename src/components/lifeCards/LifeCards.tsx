import type { SessionSummary } from '../../api/sessionTypes';
import { ageText, completedLifePrefix, lifeYears } from '../../game/completedLives';
import type { CompletedLifeEntry } from '../../game/completedLives';
import { lives as parallelLives } from '../../mocks/mockData';
import completedImage from '../../assets/completed-life-hero.png';
import styles from './LifeCards.module.scss';

type Card = {
  id: string;
  name: string;
  years: string;
  country: string;
  description: string;
  image: string;
  imagePosition?: string;
};

function cardFromSave({ summary, session }: CompletedLifeEntry): Card {
  return {
    id: summary.id,
    name: session?.character.name ?? summary.name,
    years: session ? lifeYears(session) : ageText(summary.age),
    country: session?.character.birthplace.country ?? '',
    description: `Прожито ${ageText(session?.state.age ?? summary.age)}.`,
    image: completedImage,
  };
}

function CardContent({ life }: { life: Card }) {
  return (
    <>
      <img
        className={styles.lifeCards__image}
        src={life.image}
        alt=""
        style={life.imagePosition ? { objectPosition: life.imagePosition } : undefined}
      />
      <h4 className={styles.lifeCards__name}>{life.name}</h4>
      <span className={styles.lifeCards__years}>
        {life.years} &nbsp;{life.country}
      </span>
      <p className={styles.lifeCards__description}>{life.description}</p>
    </>
  );
}

type Props = {
  entries?: CompletedLifeEntry[];
  onOpen?: (id: SessionSummary['id']) => void;
  className?: string;
};

export default function LifeCards({ entries, onOpen, className = '' }: Props) {
  const personal = entries !== undefined && entries.length > 0;
  const cards: Card[] = personal ? entries.map(cardFromSave) : parallelLives.map((life, index) => ({
    ...life, id: String(life.id), imagePosition: index === 0 ? 'center 71.4%' : undefined,
  }));

  return (
    <section
      className={`${styles.lifeCards} ${className}`}
      aria-label={personal ? 'Прожитые жизни' : 'Параллельные жизни'}
    >
      <h3 className={styles.lifeCards__title}>
        {personal ? 'Прожитые жизни' : 'Параллельные жизни'}
      </h3>
      <div className={styles.lifeCards__list}>
        {cards.map((life) => personal ? (
          <a
            key={life.id}
            className={styles.lifeCards__card}
            href={`${completedLifePrefix}${life.id}`}
            onClick={onOpen ? (event) => {
              if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onOpen(life.id);
            } : undefined}
          >
            <CardContent life={life} />
          </a>
        ) : (
          <article className={styles.lifeCards__card} key={life.id}>
            <CardContent life={life} />
          </article>
        ))}
      </div>
    </section>
  );
}
