import React, { useState, useEffect } from 'react';
import Login from './Login';
import EstoqueControl from './EstoqueControl';
import Dashboard from './Dashboard';

interface User {
  id?: number;
  usuario: string;
  senha?: string;
  role?: string;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'estoque' | 'dashboard'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleLogin = (userData: User) => {
    console.log('Login successful:', userData);
    setUser(userData);
    setCurrentScreen('estoque');
  };

  const handleLogout = () => {
    console.log('Logout');
    setUser(null);
    setCurrentScreen('login');
  };

  const navigateToScreen = (screen: 'estoque' | 'dashboard') => {
    console.log('Navigating to:', screen);
    setCurrentScreen(screen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Erro: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  try {
    if (currentScreen === 'login') {
      return <Login onLogin={handleLogin} />;
    }

    return (
      <div className="min-h-screen bg-gray-900 text-gray-300">
        {/* Header Navigation */}
        <header className="bg-gray-800 border-b border-gray-600 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-amber-400">Clínica Ballarin</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => navigateToScreen('estoque')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currentScreen === 'estoque'
                      ? 'bg-amber-500 text-white'
                      : 'text-gray-300 hover:text-amber-400'
                  }`}
                >
                  Controle de Estoque
                </button>
                <button
                  onClick={() => navigateToScreen('dashboard')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currentScreen === 'dashboard'
                      ? 'bg-amber-500 text-white'
                      : 'text-gray-300 hover:text-amber-400'
                  }`}
                >
                  Dashboard Analytics
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                Usuário: <span className="font-semibold text-amber-400">{user?.usuario}</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-amber-400 hover:text-amber-300"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-6">
          {currentScreen === 'estoque' && <EstoqueControl user={user} />}
          {currentScreen === 'dashboard' && <Dashboard />}
        </main>
      </div>
    );
  } catch (err) {
    console.error('App render error:', err);
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Erro na renderização do app</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
};

export default App;