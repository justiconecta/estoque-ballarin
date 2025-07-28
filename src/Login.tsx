import React, { useState } from 'react';

interface User {
  id?: number;
  usuario: string;
  senha?: string;
  role?: string;
}

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // Credenciais locais para fallback
  const localUsers = [
    { id: 1, usuario: 'Admin', senha: 'admin123', role: 'admin' },
    { id: 2, usuario: 'Funcionario', senha: 'func123', role: 'staff' }
  ];

  const handleSubmit = async (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    
    setError('');
    setIsLoading(true);
    setDebugInfo('Iniciando login...');

    console.log('Login attempt:', { username, password: '***' });

    // Validação básica
    if (!username || !password) {
      setError('Por favor, preencha usuário e senha.');
      setIsLoading(false);
      return;
    }

    try {
      setDebugInfo('Tentando conectar com backend...');
      
      // Tentar autenticar com backend primeiro
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      console.log('Backend response status:', response.status);
      setDebugInfo(`Backend respondeu com status: ${response.status}`);

      if (response.ok) {
        const userData = await response.json();
        console.log('Login successful:', userData);
        setDebugInfo('Login realizado com sucesso!');
        onLogin(userData);
        return;
      } else {
        const errorData = await response.json();
        console.log('Backend error:', errorData);
        setDebugInfo('Backend rejeitou as credenciais, tentando autenticação local...');
        
        // Fallback para autenticação local
        tryLocalAuth();
      }
    } catch (networkError) {
      console.log('Network error:', networkError);
      setDebugInfo('Erro de rede, tentando autenticação local...');
      
      // Fallback para autenticação local se backend não estiver disponível
      tryLocalAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const tryLocalAuth = () => {
    console.log('Trying local auth for:', username);
    
    const user = localUsers.find(u => 
      u.usuario.toLowerCase() === username.toLowerCase() && u.senha === password
    );

    if (user) {
      console.log('Local auth successful:', user);
      setDebugInfo('Autenticação local bem-sucedida!');
      const { senha, ...userWithoutPassword } = user;
      onLogin(userWithoutPassword);
    } else {
      console.log('Local auth failed');
      setDebugInfo('Credenciais inválidas em ambas as tentativas');
      setError('Usuário ou senha incorreta. Tente novamente.');
    }
  };

  // Auto-fill para desenvolvimento (remover em produção)
  const fillTestCredentials = (userType: 'admin' | 'func') => {
    if (userType === 'admin') {
      setUsername('Admin');
      setPassword('admin123');
    } else {
      setUsername('Funcionario');
      setPassword('func123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900 bg-opacity-97">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 bg-opacity-90 rounded-xl shadow-2xl">
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-auto text-amber-400" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-50">
            Clínica Ballarin
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Sistema de Gerenciamento
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Nome do Usuário
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="Admin ou Funcionario"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="admin123 ou func123"
              />
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          {/* Botões de teste para desenvolvimento */}
          <div className="flex space-x-2">
            <button
              onClick={() => fillTestCredentials('admin')}
              className="flex-1 py-1 px-2 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Admin
            </button>
            <button
              onClick={() => fillTestCredentials('func')}
              className="flex-1 py-1 px-2 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Funcionário
            </button>
          </div>

          {/* Debug info */}
          {debugInfo && (
            <div className="text-xs text-blue-400 bg-gray-900 p-2 rounded">
              Debug: {debugInfo}
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          {/* Credenciais válidas */}
          <div className="text-xs text-gray-500 text-center">
            <p>Credenciais válidas:</p>
            <p>Admin / admin123</p>
            <p>Funcionario / func123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;