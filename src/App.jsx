import Mainpage from './components/mainPage/mainPage.tsx';
import Header from './components/header/header.jsx';
import Navbar from './components/navbar/navbar.jsx';
import BirthplacePage from './components/bearthPage/bearthPage.tsx';
import BirthSetupPage from './components/bearthSetupPage/bearthSetupPage.tsx';
import GeneratedBirthPage from './components/bearthSetupPage/GeneratedBirthPage';
import ChangeParametersPage from './components/changeParametersPage/changeParametersPage.tsx';
import GamePage from './components/gamePage/GamePage';
import CompletedLifePage from './components/completedLifePage/CompletedLifePage';
import { completedLifeId, completedLifePrefix } from './game/completedLives';
import { useCallback, useEffect, useState } from 'react';
import { initialSettings, initialStats } from './mocks/mockData';
import { useServerLife } from './game/useServerLife';
import { toCharacterChanges, toCharacterParameters } from './api/characterMapper';

const serverLifeHash = '#server-life';
const generatedBirthHash = '#server-birth';

function App() {
  const [page, setPage] = useState(() => {
    if (completedLifeId(window.location.hash)) return 'completedLife';
    if (window.location.hash === generatedBirthHash) {
      return 'generatedBirth';
    }
    return window.location.hash === serverLifeHash ? 'serverLife' : 'home';
  });
  const [characterSettings, setCharacterSettings] = useState(initialSettings);
  const [characterStats, setCharacterStats] = useState(initialStats);
  const [resumeMessage, setResumeMessage] = useState('');
  const [archiveId, setArchiveId] = useState(() => completedLifeId(window.location.hash));
  const serverLife = useServerLife();
  const { connect } = serverLife;

  const completeBirthplace = useCallback(() => setPage('birthSetup'), []);
  const completeGeneratedBirthplace = useCallback(() => setPage('generatedBirth'), []);

  const openLife = useCallback((restoring = false) => {
    const restoreBirth = restoring && window.location.hash === generatedBirthHash;
    connect((connection) => {
      if (connection === 'saved') {
        window.history.replaceState(null, '', restoreBirth ? generatedBirthHash : serverLifeHash);
        setPage(restoreBirth ? 'generatedBirth' : 'serverLife');
        return;
      }
      clearServerLocation();
      setResumeMessage(connection === 'offline'
        ? 'Не удалось подключиться к сохранениям. Попробуйте продолжить позже.'
        : 'Сохранённых жизней пока нет. Нажмите «Играть», чтобы начать новую.');
      setPage('home');
    }, { latest: !restoring });
  }, [connect]);

  useEffect(() => {
    if ([serverLifeHash, generatedBirthHash].includes(window.location.hash)) {
      openLife(true);
    }
  }, [openLife]);

  useEffect(() => {
    const navigate = () => {
      const id = completedLifeId(window.location.hash);
      if (id) {
        setArchiveId(id);
        setPage('completedLife');
      } else if ([serverLifeHash, generatedBirthHash].includes(window.location.hash)) {
        openLife(true);
      } else if (!window.location.hash) {
        setPage('home');
      }
    };
    window.addEventListener('hashchange', navigate);
    window.addEventListener('popstate', navigate);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('popstate', navigate);
    };
  }, [openLife]);

  useEffect(() => {
    if (['changeParameters', 'generatedParameters', 'life', 'serverLife', 'generatedBirth', 'completedLife'].includes(page)) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    }
  }, [page]);

  function showServerLife() {
    window.history.replaceState(null, '', serverLifeHash);
    setPage('serverLife');
  }

  function openCompletedLife(id) {
    window.history.pushState(null, '', `${completedLifePrefix}${id}`);
    setArchiveId(id);
    setPage('completedLife');
  }

  function finishLifeFilm(id) {
    window.history.replaceState(null, '', `${completedLifePrefix}${id}`);
    setArchiveId(id);
    setPage('completedLife');
  }

  function goHome() {
    if (!serverLife.reset()) {
      return;
    }
    clearServerLocation();
    setPage('home');
  }

  function startSetup() {
    if (!serverLife.reset()) {
      return;
    }
    clearServerLocation();
    setResumeMessage('');
    setCharacterSettings({ ...initialSettings });
    setCharacterStats({ ...initialStats });
    setPage('birthplace');
  }

  function startLife() {
    setPage('life');
  }

  function generateLife() {
    if (!serverLife.reset()) {
      return;
    }
    setResumeMessage('');
    setPage('generating');
    serverLife.generate(() => {
      window.history.replaceState(null, '', generatedBirthHash);
    });
  }

  const isChangeParameters = page === 'changeParameters' || page === 'generatedParameters';
  const generatedParameters = serverLife.session ? toCharacterParameters(serverLife.session) : null;

  return (
    <div className="app-container">
      {!isChangeParameters && page !== 'birthplace' && page !== 'generating' && (
        <Header onItemClick={goHome} />
      )}

      <div className="app-content">
        {page === 'home' && (
          <Mainpage
            onStart={generateLife}
            onMockStart={startSetup}
            onContinue={() => openLife()}
            busy={serverLife.busy}
            failure={serverLife.failure}
            resumeMessage={resumeMessage}
            onOpenLife={openCompletedLife}
          />
        )}

        {page === 'completedLife' && archiveId && (
          <CompletedLifePage
            key={archiveId}
            id={archiveId}
            onStart={generateLife}
            onHome={goHome}
          />
        )}

        {page === 'birthplace' && (
          <BirthplacePage onComplete={completeBirthplace} />
        )}

        {page === 'generating' && (
          <BirthplacePage
            result={serverLife.session?.character.birthplace ?? null}
            failure={serverLife.failure}
            busy={serverLife.busy}
            onMockStart={startSetup}
            onComplete={completeGeneratedBirthplace}
          />
        )}

        {page === 'birthSetup' && (
          <BirthSetupPage
            settings={characterSettings}
            stats={characterStats}
            onStartLife={startLife}
            onChangeParameters={() => setPage('changeParameters')}
            startBusy={serverLife.busy}
            startFailure={serverLife.failure}
          />
        )}

        {page === 'generatedBirth' && (
          serverLife.session ? (
            <GeneratedBirthPage
              session={serverLife.session}
              onStartLife={showServerLife}
              onShowParameters={() => setPage('generatedParameters')}
            />
          ) : (
            <div>
              {serverLife.busy && <p role="status">Загрузка сохранения…</p>}
              {serverLife.failure && (
                <div>
                  <p role="alert">{serverLife.failure.message}</p>
                  {serverLife.failure.retry && (
                    <button type="button" onClick={serverLife.failure.retry} disabled={serverLife.busy}>
                      Повторить
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {page === 'changeParameters' && (
          <ChangeParametersPage
            values={characterSettings}
            statValues={characterStats}
            onSave={(settings, stats) => {
              setCharacterSettings(settings);
              setCharacterStats(stats);
            }}
            onBack={() => setPage('birthSetup')}
            onApply={() => setPage('birthSetup')}
          />
        )}

        {page === 'generatedParameters' && generatedParameters && (
          <ChangeParametersPage
            key={`${serverLife.session.id}:${serverLife.session.version}`}
            values={generatedParameters.settings}
            statValues={generatedParameters.stats}
            server={{
              provider: serverLife.session.provider,
              busy: serverLife.busy,
              failure: serverLife.failure,
              notice: serverLife.notice,
              onSave: (settings, stats) => {
                const changes = toCharacterChanges(serverLife.session, settings, stats);
                serverLife.editCharacter(changes, () => setPage('generatedBirth'));
              },
            }}
            onBack={() => setPage('generatedBirth')}
            onApply={() => setPage('generatedBirth')}
          />
        )}

        {(page === 'life' || page === 'serverLife') && (
          <GamePage
            settings={characterSettings}
            stats={characterStats}
            server={page === 'serverLife' ? serverLife : undefined}
            onRestart={page === 'serverLife' ? generateLife : startSetup}
            onCompleted={finishLifeFilm}
          />
        )}
      </div>
      {page !== 'birthplace' && page !== 'generating' && <Navbar />}
    </div>
    
  );
}

function clearServerLocation() {
  if ([serverLifeHash, generatedBirthHash].includes(window.location.hash)
    || window.location.hash.startsWith(completedLifePrefix)) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export default App
