import Mainpage from './components/mainPage/mainPage.jsx'
import Header from './components/header/header.jsx'
import Navbar from './components/navbar/navbar.jsx'
import BirthplacePage from './components/bearthPage/bearthPage.jsx'
import BirthSetupPage from './components/bearthSetupPage/bearthSetupPage.jsx'

import { useEffect, useState } from 'react'

function App() {
  const [page, setPage] = useState('home');

  useEffect(() => {
    if (page !== 'birthplace') return;

    const timer = setTimeout(() => {
      setPage('birthSetup');
    }, 3000);

    return () => clearTimeout(timer);
  }, [page]);

  return(
    <div className="app-container">
      <Header onItemClick={() => setPage('home')}  />

      <div className="app-content">
        {page === 'home' && (
          <Mainpage onStart={() => setPage('birthplace')} />
        )}

        {page === 'birthplace' && (
          <BirthplacePage />
        )}

        {page === 'birthSetup' && (
          <BirthSetupPage
            onStartLife={() => setPage('life')}
            onChangeParameters={() => setPage('home')}
          />
        )}

        {page === 'life' && (
          <div>Здесь будет экран жизни персонажа</div>
        )}
      </div>
      <Navbar />
    </div>
    
  )
}

export default App
