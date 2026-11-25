import { useRef } from 'react'
import CustomScrollbar from '../customScrollbar/customScrollbar.tsx'
import heroImage from '../../assets/figma-main-hero.png'
import canadaFlag from '../../assets/figma-canada.png'
import chanceBackground from '../../assets/figma-chance-bg.svg'
import chanceOutline from '../../assets/figma-chance-outline.svg'
import chanceHighlight from '../../assets/figma-chance-highlight.svg'
import divider from '../../assets/figma-divider.svg'
import styles from './mainPage.module.scss'
import { birthPreview } from '../../mocks/mockData'
import LifeCards from '../lifeCards/LifeCards'
import { useCompletedLives } from '../../game/useCompletedLives'

type MainPageProps = {
  onStart: () => void
  onContinue: () => void
  onMockStart: () => void
  busy: boolean
  failure: { message: string; retry?: () => void } | null
  resumeMessage: string
  onOpenLife: (id: string) => void
}

function Hero() {
  return (
    <section className={styles.mainPage__hero} aria-label="Зимняя улица Оттавы">
      <img className={styles.mainPage__heroImage} src={heroImage} alt="Человек идёт по заснеженной улице на закате" />
    </section>
  )
}

function BirthChance() {
  return (
    <section className={styles.mainPage__chance} aria-label="Шанс места рождения">
      <img className={styles.mainPage__chanceBackground} src={chanceBackground} alt="" />
      <div className={styles.mainPage__chanceInfo}>
        <span className={styles.mainPage__chanceLabel}>ШАНС РОДИТЬСЯ В</span>
        <div className={styles.mainPage__country}>
          <img className={styles.mainPage__flag} src={canadaFlag} alt="Флаг Канады" />
          <span>{birthPreview.country}, {birthPreview.city}</span>
        </div>
      </div>
      <div className={styles.mainPage__chanceValue}>
        <img src={chanceOutline} alt="" />
        <img src={chanceHighlight} alt="" />
        <span>ШАНС</span>
        <strong>{birthPreview.birthChance.toUpperCase()}</strong>
      </div>
    </section>
  )
}

function MainPage({ onStart, onContinue, onMockStart, busy, failure, resumeMessage, onOpenLife }: MainPageProps) {
  const scrollContainerRef = useRef<HTMLElement>(null)
  const completed = useCompletedLives()

  return (
    <div className={styles.mainPageWrapper}>
      <main className={styles.mainPage} ref={scrollContainerRef}>
        <Hero />
        <div className={styles.mainPage__content}>
          <section className={styles.mainPage__intro}>
            <h2 className={styles.mainPage__title}>Жизнь без конца</h2>
            <p className={styles.mainPage__description}>
              Ты рождаешься в случайной стране, семье и эпохе и проживаешь целую жизнь.
              Где учиться, с кем сблизиться, остаться дома или уехать – твои решения меняют ход истории.
            </p>
          </section>
          <BirthChance />
          <div className={styles.mainPage__separator} aria-hidden="true">
            <img src={divider} alt="" />
          </div>
          <button
            className={styles.mainPage__start}
            type="button"
            onClick={onStart}
            disabled={busy || Boolean(failure?.retry)}
            aria-busy={busy}
          >
            <span aria-hidden="true">🎲</span>
            <span>{busy ? 'Загрузка…' : 'Играть'}</span>
          </button>
          <button
            className={styles.mainPage__continue}
            type="button"
            onClick={onContinue}
            disabled={busy || Boolean(failure?.retry)}
            aria-busy={busy}
          >
            Продолжить жизнь
          </button>
          {failure && (
            <div>
              <p role="alert">{failure.message}</p>
              {failure.retry && (
                <button
                  className={styles.mainPage__continue}
                  type="button"
                  onClick={failure.retry}
                  disabled={busy}
                >
                  Повторить
                </button>
              )}
              <button
                className={styles.mainPage__continue}
                type="button"
                onClick={onMockStart}
                disabled={busy}
              >
                Играть с моковыми данными
              </button>
            </div>
          )}
          {resumeMessage && <p role="status">{resumeMessage}</p>}
          {completed.loading && <p role="status">Загружаем прожитые жизни…</p>}
          {completed.error && (
            <div>
              <p role="alert">{completed.error}</p>
              <button type="button" className={styles.mainPage__continue} onClick={completed.retry}>
                Повторить загрузку жизней
              </button>
            </div>
          )}
          {(completed.entries.length > 0 || !completed.loading) && (
            <LifeCards
              className={styles.mainPage__lives}
              entries={completed.entries}
              onOpen={onOpenLife}
            />
          )}
        </div>
      </main>
      <CustomScrollbar scrollContainerRef={scrollContainerRef} />
    </div>
  )
}

export default MainPage
