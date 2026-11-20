import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { initialSettings, initialStats } from '../../mocks/mockData';
import { character } from '../../mocks/mockData';
import { gameDefaults, statLabels } from '../../mocks/lifeEvents';
import type { GameStats, LifeEvent } from '../../mocks/lifeEvents';
import { speeds, YEAR_MS } from '../../game/simulation';
import { useLifeSimulation } from '../../game/useLifeSimulation';
import familyImage from '../../assets/game-family.png';
import relationshipIcon from '../../assets/game-relationships.png';
import YearFocus from './YearFocus';
import DecisionModal from './DecisionModal';
import ClosePeopleTab from './ClosePeopleTab';
import FinancesTab from './FinancesTab';
import styles from './GamePage.module.scss';
import { END_AGE } from '../../game/simulation';
import { personLabels } from '../../mocks/lifeEconomy';
import type { PersonId } from '../../mocks/lifeEconomy';
import SpendingPanel from './SpendingPanel';
import { getShopItems } from '../../mocks/spendingCatalog';
import type { ShopSection } from '../../mocks/spendingCatalog';

type Props = {
  settings: typeof initialSettings;
  stats: typeof initialStats;
};

const tabs = ['Летопись', 'Траты и вложения', 'Близкие'] as const;
type Tab = typeof tabs[number];

function CharacterStats({ stats }: { stats: GameStats }) {
  return (
    <section className={styles.game__stats} aria-label="Характеристики">
      {(Object.keys(statLabels) as (keyof GameStats)[]).map((key, index) => (
        <div className={styles.game__stat} key={key}>
          <span>
            {key === 'relationships' ? (
              <img src={relationshipIcon} alt="" />
            ) : (
              ['❤️', '🙂', '🧠'][index]
            )}
            {' '}{statLabels[key]}
          </span>
          <strong>{stats[key]}</strong>
          <progress max={100} value={stats[key]} aria-label={statLabels[key]} />
        </div>
      ))}
    </section>
  );
}

function LifeHistory({ events, birthText }: { events: LifeEvent[]; birthText: string }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  function toggleFavorite(id: string) {
    setFavorites((previous) => previous.includes(id)
      ? previous.filter((favorite) => favorite !== id)
      : [...previous, id]);
  }

  return (
    <section className={styles.game__card}>
      <h2>Летопись жизни</h2>
      <p className={styles.game__muted}>
        Сначала новые · нажми на ☆, чтобы запомнить момент
      </p>
      <div className={styles.game__history}>
        {[...events].reverse().map((event) => (
          <article key={event.id} className={styles.game__event}>
            <span className={styles.game__badge}>
              {event.age < 1
                ? '0 лет'
                : `${event.age} ${event.age === 1 ? 'год' : event.age < 5 ? 'года' : 'лет'}`}
            </span>
            <div>
              <h3>{event.title}</h3>
              <p>{event.id === 'birth' ? birthText : event.text}</p>
              <div className={styles.game__changes}>
                {(Object.keys(event.changes) as (keyof GameStats)[]).map((key) => (
                  <span key={key}>
                    {statLabels[key]} {Number(event.changes[key]) > 0 ? '+' : ''}{event.changes[key]}
                  </span>
                ))}
                {event.aura ? (
                  <span>Аура {event.aura > 0 ? '+' : ''}{event.aura}</span>
                ) : null}
                {(Object.keys(event.closeness || {}) as PersonId[]).map((person) => (
                  <span key={person}>
                    {personLabels[person]}: близость {Number(event.closeness?.[person]) > 0 ? '+' : ''}{event.closeness?.[person]}
                  </span>
                ))}
                {event.money?.income ? (
                  <span>Доход +{event.money.income.toLocaleString('ru-RU')} ₽</span>
                ) : null}
                {event.money?.expenses ? (
                  <span>Расход −{event.money.expenses.toLocaleString('ru-RU')} ₽</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Запомнить: ${event.title}`}
              aria-pressed={favorites.includes(event.id)}
              onClick={() => toggleFavorite(event.id)}
            >
              {favorites.includes(event.id) ? '★' : '☆'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Simulation({ settings, stats, onRestart }: Props & { onRestart: () => void }) {
  const initial = {
    health: stats.health,
    intelligence: stats.intelligence,
    happiness: gameDefaults.happiness,
    relationships: gameDefaults.relationships,
  };
  const game = useLifeSimulation(initial, stats.appearance);
  const [showFamily, setShowFamily] = useState(false);
  const [tab, setTab] = useState<Tab>('Летопись');
  const [shop, setShop] = useState<{ section: ShopSection; itemId?: string } | null>(null);
  const lastMove = [...game.purchases].reverse().find((purchase) => purchase.section === 'city' || purchase.section === 'country');
  const location = lastMove
    ? getShopItems(lastMove.section, lastMove.country).find((item) => item.id === lastMove.itemId)?.location
    : undefined;
  const ownedHouse = game.purchases.some((purchase) => purchase.itemId === 'house');
  const currentSettings = {
    ...settings,
    country: location?.country || settings.country,
    city: location?.city || settings.city,
    housing: ownedHouse ? 'Загородный дом' : settings.housing,
  };
  const birthText = `${settings.name}: рождение в ${[settings.city, settings.country].filter(Boolean).join(', ')} в ${character.birthYear} году. ${settings.family}. Достаток семьи: ${settings.wealth.toLowerCase()}. Язык в семье: ${settings.language.toLowerCase()}.`;

  return (
    <main className={styles.game}>
      <section className={styles.game__age}>
        <h1>Возраст <strong>{game.age}</strong></h1>
        <div className={styles.game__meta}>
          <span>{Number(character.birthYear) + game.age} · {settings.name}</span>
          <span>1 год = {60 / game.speed} сек.</span>
        </div>
        <progress max={1} value={game.progress} aria-label="Прогресс текущего года" />
      </section>

      <div className={styles.game__controls}>
        <button
          type="button"
          onClick={game.togglePause}
          disabled={game.complete}
          aria-label={game.paused ? 'Продолжить' : 'Пауза'}
        >
          {game.paused ? '▶' : 'Ⅱ'}
        </button>
        {speeds.map((speed) => (
          <button
            type="button"
            key={speed}
            aria-pressed={game.speed === speed}
            onClick={() => game.changeSpeed(speed)}
            disabled={game.complete}
          >
            {speed}×
          </button>
        ))}
        <button
          type="button"
          aria-pressed={game.auto}
          onClick={game.toggleAuto}
          disabled={game.complete}
        >
          Авто
        </button>
      </div>

      <section className={styles.game__family}>
        <img src={familyImage} alt="Иллюстрация семейного вечера" />
        <button
          type="button"
          aria-expanded={showFamily}
          onClick={() => setShowFamily(!showFamily)}
        >
          {[currentSettings.city, currentSettings.country, currentSettings.housing, settings.family].filter(Boolean).join(' · ')}
          <span>⌄</span>
        </button>
        {showFamily && (
          <p>
            Профессия матери: {settings.mother}. Профессия отца: {settings.father}.
            Братья и сёстры: {settings.siblings}. {settings.relationships}.
            Домашние животные: {game.purchases.filter((purchase) => purchase.section === 'pets').map((purchase) => purchase.petName).join(', ') || settings.pets}.
          </p>
        )}
      </section>

      <CharacterStats stats={game.stats} />

      <section className={styles.game__card}>
        <h2>
          ⚖ Аура
          <span className={styles.game__auraValue}>
            {game.aura > 0 ? '+' : ''}{game.aura}
          </span>
        </h2>
        <div
          className={styles.game__aura}
          style={{ '--aura-position': `${(game.aura + 100) / 2}%` } as CSSProperties}
          role="meter"
          aria-label="Аура"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={game.aura}
        >
          <span />
        </div>
        <div className={styles.game__meta}>
          <span>Тёмная<br />−100</span>
          <span>0</span>
          <span>Светлая<br />+100</span>
        </div>
      </section>

      <YearFocus
        key={game.age}
        age={game.age}
        location={[currentSettings.city, currentSettings.country].filter(Boolean).join(', ')}
        value={game.focus}
        disabled={game.complete}
        onChange={game.chooseFocus}
        activity={game.finances.career}
      />

      <nav className={styles.game__tabs} aria-label="Разделы жизни">
        {tabs.map((item) => (
          <button
            type="button"
            aria-pressed={tab === item}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div hidden={tab !== 'Летопись'}>
        <LifeHistory events={game.events} birthText={birthText} />
      </div>

      <div hidden={tab !== 'Траты и вложения'}>
        <FinancesTab
          age={game.elapsed / YEAR_MS}
          finances={game.finances}
          purchases={game.purchases}
          onOpen={(section, itemId) => {
            if (game.blockTime(true)) setShop({ section, itemId });
          }}
        />
      </div>

      {tab === 'Близкие' && (
        <ClosePeopleTab
          settings={settings}
          age={game.age}
          closeness={game.closeness}
        />
      )}

      {game.complete && (
        <section className={styles.game__card} role="status">
          <p>Демонстрация завершена. Продолжение жизни появится позже</p>
          <button className={styles.game__restart} type="button" onClick={onRestart}>
            Прожить первые {END_AGE} года снова
          </button>
        </section>
      )}

      {game.decision && (
        <DecisionModal
          key={game.decision.id}
          decision={game.decision}
          age={game.age}
          year={Number(character.birthYear) + game.age}
          onChoose={game.answerDecision}
          onAuto={game.toggleAuto}
          onDefer={game.deferDecision}
        />
      )}

      {shop && (
        <SpendingPanel
          key={shop.section}
          section={shop.section}
          initialItemId={shop.itemId}
          country={currentSettings.country}
          city={currentSettings.city}
          age={game.elapsed / YEAR_MS}
          balance={game.finances.savings}
          health={game.stats.health}
          appearance={game.appearance}
          purchases={game.purchases}
          onClose={() => setShop(null)}
          onBlockTime={game.blockTime}
          onBuy={game.purchase}
        />
      )}
    </main>
  );
}

export default function GamePage(props: Props) {
  const [run, setRun] = useState(0);

  return (
    <Simulation
      key={run}
      {...props}
      onRestart={() => setRun((value) => value + 1)}
    />
  );
}
