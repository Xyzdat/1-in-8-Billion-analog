import type { Finances } from '../../api/financeTypes';
import type { Session } from '../../api/sessionTypes';
import styles from './LifeSlideshow.module.scss';

type Props = {
  session: Session;
  finances?: Finances | null;
};

export default function DeathIntro({ session, finances }: Props) {
  const death = session.simulation?.death;
  const location = finances?.version === session.version ? finances.location : null;
  const place = location && [location.country, location.city].filter(Boolean).join(', ');

  return (
    <section className={styles.lifeFilm__intro} aria-labelledby="death-intro-title">
      <span className={styles.lifeFilm__dove} aria-hidden="true">
        🕊️
      </span>
      <h1 id="death-intro-title">
        Последний год:<br />
        возраст {death?.age ?? session.state.age}
      </h1>
      <p className={styles.lifeFilm__farewell}>
        Эта жизнь завершилась{place ? `. ${place}` : '.'}
      </p>
      <p className={styles.lifeFilm__cause}>
        {death?.causeDetails?.label
          ? `Причина смерти · ${death.causeDetails.label}`
          : 'Причина смерти не указана'}
      </p>
      <div className={styles.lifeFilm__lastWords}>
        <h2>Память о жизни</h2>
        <p>Твои решения и прожитые моменты останутся в истории.</p>
      </div>
    </section>
  );
}
