import type { HighlightSlide as Slide } from '../../api/sessionTypes';
import { ageText } from '../../game/completedLives';
import { lifeSlideSummary } from '../../game/lifeFilm';
import styles from './LifeSlideshow.module.scss';

export default function HighlightSlide({ slide }: { slide: Slide }) {
  return (
    <article className={styles.lifeFilm__slide} aria-labelledby="highlight-slide-title">
      <p className={styles.lifeFilm__age}>{ageText(slide.age)}</p>
      <div className={styles.lifeFilm__story} tabIndex={0} aria-label="История важного момента">
        <h1 id="highlight-slide-title" className={styles.lifeFilm__reveal}>
          {slide.title}
        </h1>
        <p className={`${styles.lifeFilm__reveal} ${styles.lifeFilm__summary}`}>
          {lifeSlideSummary(slide)}
        </p>
      </div>
    </article>
  );
}
