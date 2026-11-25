import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { CharacterSettings, CharacterStats as InitialCharacterStats } from '../../types/character';
import { character } from '../../mocks/mockData';
import { gameDefaults, statLabels } from '../../mocks/lifeEvents';
import type { GameStats } from '../../mocks/lifeEvents';
import { speeds, YEAR_MS } from '../../game/simulation';
import { useLifeSimulation } from '../../game/useLifeSimulation';
import { useServerClock } from '../../game/useServerClock';
import { useServerHistory } from '../../game/useServerHistory';
import type { ServerLife } from '../../game/useServerLife';
import type { AdultLife, Session, SimulationFamilyMember } from '../../api/sessionTypes';
import { completedLifeMessage, toServerHistory } from '../../game/serverPresentation';
import type { PresentedLifeEvent } from '../../game/serverPresentation';
import { sessionsApi } from '../../api';
import { useSessionResource } from '../../game/useSessionResource';
import { useLifeFavorites } from '../../game/useLifeFavorites';
import LifeSlideshow from '../lifeSlideshow/LifeSlideshow';
import EngineCredit from '../bearthSetupPage/EngineCredit';
import familyImage from '../../assets/game-family.png';
import relationshipIcon from '../../assets/game-relationships.png';
import YearFocus from './YearFocus';
import YearProgress from './YearProgress';
import DecisionModal from './DecisionModal';
import ClosePeopleTab from './ClosePeopleTab';
import HistoryScroll from './HistoryScroll';
import FinancesTab from './FinancesTab';
import ServerFinancesTab from './ServerFinancesTab';
import type { ServerFinancesTabProps } from './ServerFinancesTab';
import styles from './GamePage.module.scss';
import { END_AGE } from '../../game/simulation';
import { personLabels } from '../../mocks/lifeEconomy';
import type { PersonId } from '../../mocks/lifeEconomy';
import SpendingPanel from './SpendingPanel';
import { getShopItems } from '../../mocks/spendingCatalog';
import type { ShopSection } from '../../mocks/spendingCatalog';
import {Pause, Play} from 'lucide-react'

type Props = {
  settings: CharacterSettings;
  stats: InitialCharacterStats;
  server?: ServerLife;
  onRestart: () => void;
  onCompleted?: (id: string) => void;
};

type LocalGame = ReturnType<typeof useLifeSimulation>;
type GameViewProps = {
  settings: Partial<{ [Key in keyof CharacterSettings]: string | null }> & { name: string };
  birthYear: number;
  game: Pick<LocalGame, 'age' | 'progress' | 'speed' | 'changeSpeed' | 'paused' | 'togglePause'
    | 'auto' | 'toggleAuto' | 'complete' | 'stats'> & { aura: number | null; events: PresentedLifeEvent[] };
  local?: { game: LocalGame; settings: CharacterSettings };
  serverFinances?: ServerFinancesTabProps & { activate: () => void };
  serverFamily?: SimulationFamilyMember[];
  serverAdult?: AdultLife | null;
  sessionId?: string;
  completionMessage?: string;
  decisionDialog?: ReactNode;
  requestStatus?: ReactNode;
  credit?: ReactNode;
  onRestart: () => void;
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

function LifeHistory({ events, birthText, peopleLabels, sessionId }: {
  events: PresentedLifeEvent[];
  birthText?: string;
  peopleLabels?: Record<string, string>;
  sessionId?: string;
}) {
  const { favorites, toggleFavorite } = useLifeFavorites(sessionId);

  return (
    <section className={styles.game__card}>
      <h2>Летопись жизни</h2>
      <p className={styles.game__muted}>
        Сначала новые · нажми на ☆, чтобы запомнить момент
      </p>
      <HistoryScroll label="События жизни" visibleRows={7} className={styles.game__history}>
        {[...events].reverse().map((event) => (
          <article key={event.id} className={styles.game__event}>
            <span className={styles.game__badge}>
              {event.age < 1
                ? '0 лет'
                : `${event.age} ${event.age === 1 ? 'год' : event.age < 5 ? 'года' : 'лет'}`}
            </span>
            <div>
              <h3>{event.title}</h3>
              <p>{event.id === 'birth' && birthText ? birthText : event.text}</p>
              <div className={styles.game__changes}>
                {(Object.keys(event.changes) as (keyof GameStats)[]).map((key) => (
                  <span key={key}>
                    {statLabels[key]} {Number(event.changes[key]) > 0 ? '+' : ''}{event.changes[key]}
                  </span>
                ))}
                {event.aura ? (
                  <span>Аура {event.aura > 0 ? '+' : ''}{event.aura}</span>
                ) : null}
                {Object.keys(event.closeness || {}).map((person) => (
                  <span key={person}>
                    {peopleLabels?.[person] ?? personLabels[person as PersonId] ?? person}: близость {Number(event.closeness?.[person]) > 0 ? '+' : ''}{event.closeness?.[person]}
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
      </HistoryScroll>
    </section>
  );
}

function GameView({ settings, birthYear, game, local, serverFinances, serverFamily, serverAdult, sessionId, completionMessage, decisionDialog, requestStatus, credit, onRestart }: GameViewProps) {
  const [showFamily, setShowFamily] = useState(false);
  const [tab, setTab] = useState<Tab>('Летопись');
  const [shop, setShop] = useState<{ section: ShopSection; itemId?: string } | null>(null);
  const purchases = local?.game.purchases ?? [];
  const lastMove = [...purchases].reverse().find((purchase) => purchase.section === 'city' || purchase.section === 'country');
  const location = lastMove
    ? getShopItems(lastMove.section, lastMove.country).find((item) => item.id === lastMove.itemId)?.location
    : undefined;
  const ownedHouse = purchases.some((purchase) => purchase.itemId === 'house');
  const serverLocation = serverFinances?.resource.data?.location;
  const currentSettings = {
    ...settings,
    country: serverLocation?.country ?? location?.country ?? settings.country ?? '',
    city: serverLocation ? serverLocation.city ?? '' : location?.city ?? settings.city ?? '',
    housing: ownedHouse ? 'Загородный дом' : settings.housing,
  };
  const birthText = local
    ? `${settings.name}: рождение в ${[settings.city, settings.country].filter(Boolean).join(', ')} в ${birthYear} году. ${settings.family}. Достаток семьи: ${local.settings.wealth.toLowerCase()}. Язык в семье: ${local.settings.language.toLowerCase()}.`
    : undefined;
  const petNames = purchases.filter((purchase) => purchase.section === 'pets').map((purchase) => purchase.petName);
  const familyDetails = [
    settings.mother && `Профессия матери: ${settings.mother}.`,
    settings.father && `Профессия отца: ${settings.father}.`,
    settings.siblings && `Братья и сёстры: ${settings.siblings}.`,
    settings.relationships && `${settings.relationships}.`,
    (petNames.length > 0 || settings.pets) && `Домашние животные: ${petNames.join(', ') || settings.pets}.`,
  ].filter(Boolean);

  return (
    <main className={styles.game}>
      <section className={styles.game__age}>
        <h1>Возраст <strong>{game.age}</strong></h1>
        <div className={styles.game__meta}>
          <span>{birthYear + game.age} · {settings.name}</span>
          <span>1 год = {60 / game.speed} сек.</span>
        </div>
        <YearProgress
          value={game.progress}
          paused={game.paused || game.complete || Boolean(decisionDialog)}
        />
      </section>

      <div className={styles.game__controls}>
        <button
          type="button"
          onClick={game.togglePause}
          disabled={game.complete}
          aria-label={game.paused ? 'Продолжить' : 'Пауза'}
          className={styles.game__pausePlay}
        >
          {game.paused ? <Play/> : <Pause/>}
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

      {requestStatus}

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
        {showFamily && <p>{familyDetails.join(' ') || 'Сведения о семье пока недоступны.'}</p>}
      </section>

      <CharacterStats stats={game.stats} />

      {game.aura !== null && (
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
      )}

      {local ? (
        <YearFocus
          key={game.age}
          age={game.age}
          location={[currentSettings.city, currentSettings.country].filter(Boolean).join(', ')}
          value={local.game.focus}
          disabled={game.complete}
          onChange={local.game.chooseFocus}
          activity={local.game.finances.career}
        />
      ) : (
        <UnavailableSection title="Фокус этого года" />
      )}

      <nav className={styles.game__tabs} aria-label="Разделы жизни">
        {tabs.map((item) => (
          <button
            type="button"
            aria-pressed={tab === item}
            key={item}
            onClick={() => {
              setTab(item);
              if (item === 'Траты и вложения') {
                serverFinances?.activate();
              }
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      <div hidden={tab !== 'Летопись'}>
        <LifeHistory
          key={sessionId ?? 'mock'}
          sessionId={sessionId}
          events={game.events}
          birthText={birthText}
          peopleLabels={serverFamily && Object.fromEntries(serverFamily.map((person) => [person.id, person.name]))}
        />
      </div>

      <div hidden={tab !== 'Траты и вложения'}>
        {local ? (
          <FinancesTab
            age={local.game.elapsed / YEAR_MS}
            finances={local.game.finances}
            purchases={purchases}
            onOpen={(section, itemId) => {
              if (local.game.blockTime(true)) setShop({ section, itemId });
            }}
          />
        ) : serverFinances && tab === 'Траты и вложения' ? (
          <ServerFinancesTab {...serverFinances} />
        ) : null}
      </div>

      {tab === 'Близкие' && (
        local ? (
          <ClosePeopleTab
            settings={local.settings}
            age={game.age}
            closeness={local.game.closeness}
          />
        ) : serverFamily ? (
          <ClosePeopleTab family={serverFamily} adult={serverAdult} />
        ) : (
          <UnavailableSection title="Близкие" />
        )
      )}

      {game.complete && (
        <section className={styles.game__card} role="status">
          <p>{local ? 'Демонстрация завершена. Продолжение жизни появится позже' : completionMessage ?? 'Эта жизнь завершена.'}</p>
          <button className={styles.game__restart} type="button" onClick={onRestart}>
            {local ? `Прожить первые ${END_AGE} года снова` : 'Начать новую жизнь'}
          </button>
        </section>
      )}

      {credit && <section className={styles.game__card}>{credit}</section>}
      {decisionDialog}

      {shop && local && (
        <SpendingPanel
          key={shop.section}
          section={shop.section}
          initialItemId={shop.itemId}
          country={currentSettings.country}
          city={currentSettings.city}
          age={local.game.elapsed / YEAR_MS}
          balance={local.game.finances.savings}
          health={game.stats.health}
          appearance={local.game.appearance}
          purchases={purchases}
          onClose={() => setShop(null)}
          onBlockTime={local.game.blockTime}
          onBuy={local.game.purchase}
        />
      )}
    </main>
  );
}

function UnavailableSection({ title }: { title: string }) {
  return (
    <section className={styles.game__card}>
      <h2>{title}</h2>
      <p>Этот раздел пока недоступен для сохранённых жизней.</p>
    </section>
  );
}

function LocalSimulation({ settings, stats, onRestart }: Pick<Props, 'settings' | 'stats' | 'onRestart'>) {
  const game = useLifeSimulation({
    health: stats.health,
    intelligence: stats.intelligence,
    happiness: gameDefaults.happiness,
    relationships: gameDefaults.relationships,
  }, stats.appearance);
  const birthYear = Number(character.birthYear);

  return (
    <GameView
      settings={settings}
      birthYear={birthYear}
      game={game}
      local={{ game, settings }}
      onRestart={onRestart}
      decisionDialog={game.decision && (
        <DecisionModal
          key={game.decision.id}
          decision={game.decision}
          age={game.age}
          year={birthYear + game.age}
          onChoose={game.answerDecision}
          onAuto={game.toggleAuto}
          auto={game.auto}
          autoSeconds={game.autoSeconds}
          onDefer={game.deferDecision}
        />
      )}
    />
  );
}

function ServerSimulation({ session, server, onRestart, onCompleted }: {
  session: Session;
  server: ServerLife;
  onRestart: () => void;
  onCompleted?: (id: string) => void;
}) {
  const [financeEnabled, setFinanceEnabled] = useState(session.provider === 'local');
  const [shopOpen, setShopOpen] = useState(false);
  const financeResource = useSessionResource(
    session,
    server,
    'finances',
    (signal) => sessionsApi.getFinances(session.id, signal),
    financeEnabled,
  );
  const clock = useServerClock(session, server, shopOpen);
  const history = useServerHistory(session, clock.playedMs);
  const { name, birthYear, birthplace, background } = session.character;
  const { state } = session;
  const decision = state.pendingDecision;
  const failure = server.failure
    ? { ...server.failure, retry: server.failure.retry ?? server.refresh }
    : decision && server.decisionReviewRequired
      ? { message: server.notice, recoverable: true }
      : null;

  return (
    <>
      <GameView
        settings={{ ...background, name, country: birthplace.country, city: birthplace.city }}
        birthYear={birthYear}
        game={{
          ...clock,
          stats: {
            health: state.stats.health,
            happiness: state.stats.happiness,
            intelligence: state.stats.intelligence,
            relationships: state.stats.relationships,
          },
          aura: state.stats.aura,
          events: toServerHistory(history),
        }}
        serverFamily={session.simulation?.family}
        serverAdult={session.simulation?.adult}
        sessionId={session.id}
        completionMessage={completedLifeMessage(session.simulation?.death)}
        onRestart={onRestart}
        serverFinances={{
          session,
          server,
          resource: financeResource,
          activate: () => setFinanceEnabled(true),
          onBlockTime: setShopOpen,
        }}
        credit={session.provider === '1in8b' && <EngineCredit />}
        requestStatus={!decision && (
          <RequestStatus busy={false} failure={failure} notice={server.notice} />
        )}
        decisionDialog={decision && !clock.complete && (
          <DecisionModal
            key={decision.id}
            decision={{
              title: decision.title,
              options: decision.options.map((option) => ({ id: option.id, title: option.label })),
            }}
            age={state.age}
            year={birthYear + state.age}
            onChoose={(index) => {
              clock.cancelAutoDecision();
              server.answer(decision.options[index].id);
            }}
            onAuto={clock.toggleAuto}
            auto={clock.auto}
            autoSeconds={clock.autoSeconds}
            busy={server.busy}
            failure={failure}
          />
        )}
      />
      {state.status === 'COMPLETE' && onCompleted && (
        <LifeSlideshow
          key={session.id}
          session={session}
          finances={financeResource.data}
          automatic
          onFinish={() => onCompleted(session.id)}
        />
      )}
    </>
  );
}

function RequestStatus({ busy, failure, notice }: Pick<ServerLife, 'busy' | 'failure' | 'notice'>) {
  if (!busy && !failure && !notice) {
    return null;
  }
  return (
    <section className={styles.game__card}>
      {busy && <p role="status">Загрузка…</p>}
      {notice && <p role="status">{notice}</p>}
      {failure && <p role="alert">{failure.message}</p>}
      {failure?.retry && (
        <button type="button" className={styles.game__restart} onClick={failure.retry}>
          Повторить
        </button>
      )}
    </section>
  );
}

export default function GamePage(props: Props) {
  const [run, setRun] = useState(0);
  const { server } = props;

  if (server) {
    return server.session ? (
      <ServerSimulation
        key={server.session.id}
        session={server.session}
        server={server}
        onRestart={props.onRestart}
        onCompleted={props.onCompleted}
      />
    ) : (
      <main className={styles.game}>
        <RequestStatus busy={server.busy} failure={server.failure} notice={server.notice} />
      </main>
    );
  }

  return (
    <LocalSimulation
      key={run}
      settings={props.settings}
      stats={props.stats}
      onRestart={() => setRun((value) => value + 1)}
    />
  );
}
