import React, { useState } from 'react';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface LoginProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  tenant: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading = false, error }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    tenant: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!credentials.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!credentials.password.trim()) {
      errors.password = 'Senha é obrigatória';
    } else if (credentials.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (!credentials.tenant.trim()) {
      errors.tenant = 'Selecione uma clínica';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    
    if (!validateForm()) return;
    
    try {
      await onLogin(credentials);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const tenantOptions = [
    { value: 'ballarin', label: 'Clínica Ballarin' },
    { value: 'demo', label: 'Clínica Demo' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           background: 'linear-gradient(rgba(17, 24, 39, 0.97), rgba(17, 24, 39, 0.97))',
           fontFamily: 'Inter, sans-serif'
         }}>
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 bg-opacity-90 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-amber-400 mb-4">
            <LockClosedIcon className="w-full h-full" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-50">
            JustiConecta Analytics
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Dashboard de Acompanhamento Terapêutico
          </p>
        </div>

        {/* Global Error */}
        {error && (
          <div className="p-3 rounded-md bg-red-900/20 border border-red-600">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <div className="space-y-6">
          {/* Tenant Selection */}
          <div>
            <label htmlFor="tenant" className="block text-sm font-medium text-gray-300 mb-1">
              Clínica
            </label>
            <select
              id="tenant"
              value={credentials.tenant}
              onChange={(e) => handleInputChange('tenant', e.target.value)}
              className="block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              disabled={loading}
            >
              <option value="">-- Selecione uma clínica --</option>
              {tenantOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.tenant && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.tenant}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              placeholder="usuario@clinica.com"
              disabled={loading}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="block w-full px-3 py-2 pr-10 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Entrando...
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            © 2025 JustiConecta Analytics. Sistema seguro e confiável.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;