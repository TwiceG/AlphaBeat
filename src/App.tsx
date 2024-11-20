import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/Approuter';
import NavBar from './components/NavBar';

const App: React.FC = () => {
    return (
      <div className='App'>
      <BrowserRouter>
        <NavBar />
        <AppRouter />
      </BrowserRouter>
    </div>
    );
};

export default App;
