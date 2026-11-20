import Mainpage from './components/mainPage/mainPage.tsx';
import Header from './components/header/header.jsx';
import Navbar from './components/navbar/navbar.jsx';
import BirthplacePage from './components/bearthPage/bearthPage.tsx';
import BirthSetupPage from './components/bearthSetupPage/bearthSetupPage.tsx';
import ChangeParametersPage from './components/changeParametersPage/changeParametersPage.tsx';
import GamePage from './components/gamePage/GamePage';

import { useCallback, useEffect, useState } from 'react'
import { initialSettings, initialStats } from './mocks/mockData';

function App() {
  const [page, setPage] = useState('home');
  const [characterSettings, setCharacterSettings] = useState(initialSettings);
  const [characterStats, setCharacterStats] = useState(initialStats);

  const completeBirthplace = useCallback(() => setPage('birthSetup'), []);

  useEffect(() => {
    if (page === 'changeParameters' || page === 'life') {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    }
  }, [page]);

  const isChangeParameters = page === 'changeParameters';

  return(
    <div className="app-container">
      {!isChangeParameters && page !== 'birthplace' && (
        <Header onItemClick={() => setPage('home')} />
      )}

      <div className="app-content">
        {page === 'home' && (
          <Mainpage onStart={() => setPage('birthplace')} />
        )}

        {page === 'birthplace' && (
          <BirthplacePage onComplete={completeBirthplace} />
        )}

        {page === 'birthSetup' && (
          <BirthSetupPage
            settings={characterSettings}
            stats={characterStats}
            onStartLife={() => setPage('life')}
            onChangeParameters={() => setPage('changeParameters')}
          />
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

        {page === 'life' && (
          <GamePage settings={characterSettings} stats={characterStats} />
        )}
      </div>
      {page !== 'birthplace' && <Navbar />}
    </div>
    
  )
}

export default App
