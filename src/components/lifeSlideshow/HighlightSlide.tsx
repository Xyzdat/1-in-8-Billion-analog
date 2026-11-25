import type { CSSProperties } from 'react';
import type { HighlightSlide as Slide } from '../../api/sessionTypes';
import { ageText } from '../../game/completedLives';
import { lifeSlideParagraphs } from '../../game/lifeFilm';
import styles from './LifeSlideshow.module.scss';

export default function HighlightSlide({ slide }: { slide: Slide }) {
  return (
    <article className={styles.lifeFilm__slide} aria-labelledby="highlight-slide-title">
      <p className={styles.lifeFilm__age}>{ageText(slide.age)}</p>
      <div className={styles.lifeFilm__story} tabIndex={0} aria-label="История важного момента">
        <h1 id="highlight-slide-title" className={styles.lifeFilm__reveal}>
          {slide.title}
        </h1>
        {lifeSlideParagraphs(slide).map((paragraph, index) => (
          <p
            key={paragraph.id}
            className={`${styles.lifeFilm__reveal} ${paragraph.choice ? styles.lifeFilm__choice : ''}`}
            style={{ '--text-delay': `${Math.min(index + 1, 9) * 120}ms` } as CSSProperties}
          >
            {paragraph.choice && <span>Твой выбор: </span>}
            {paragraph.text}
          </p>
        ))}
      </div>
    </article>
  );
}
