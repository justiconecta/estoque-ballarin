import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AuthState, AuthContextType, LoginCredentials, User, LoginResponse } from './types';

// Constants
const AUTH_STORAGE_KEY = 'justiconecta_auth';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// Initial State
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action Types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Auth Service
class AuthService {
  private static async mockLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation
    const validCredentials = [
      { email: 'admin@ballarin.com', password: 'admin123', tenant: 'ballarin' },
      { email: 'manager@ballarin.com', password: 'manager123', tenant: 'ballarin' },
      { email: 'demo@demo.com', password: 'demo123', tenant: 'demo' },
    ];
    
    const isValid = validCredentials.some(
      cred => cred.email === credentials.email && 
              cred.password === credentials.password && 
              cred.tenant === credentials.tenant
    );
    
    if (!isValid) {
      throw new Error('Credenciais inválidas');
    }
    
    // Mock user based on email
    const mockUser: User = {
      id: '1',
      email: credentials.email,
      name: credentials.email.includes('admin') ? 'Administrador' : 
            credentials.email.includes('manager') ? 'Gerente' : 'Usuário Demo',
      role: credentials.email.includes('admin') ? 'admin' : 
            credentials.email.includes('manager') ? 'manager' : 'viewer',
      tenant: credentials.tenant,
      permissions: [
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'analytics', actions: ['read'] },
      ],
      lastLogin: new Date(),
    };
    
    return {
      user: mockUser,
      token: `mock_token_${Date.now()}`,
      expiresIn: 3600,
      refreshToken: `refresh_token_${Date.now()}`,
    };
  }
  
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.mockLogin(credentials);
  }
  
  static logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  
  static getStoredAuth(): { user: User; token: string } | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      if (!parsed.user || !parsed.token || !parsed.expiresAt) return null;
      
      // Check if token expired
      if (new Date(parsed.expiresAt) <= new Date()) {
        this.logout();
        return null;
      }
      
      return { user: parsed.user, token: parsed.token };
    } catch {
      return null;
    }
  }
  
  static storeAuth(user: User, token: string, expiresIn: number): void {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const authData = { user, token, expiresAt: expiresAt.toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      const storedAuth = AuthService.getStoredAuth();
      if (storedAuth) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: storedAuth,
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initializeAuth();
  }, []);
  
  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await AuthService.login(credentials);
      
      // Store auth data
      AuthService.storeAuth(response.user, response.token, response.expiresIn);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw error;
    }
  }, []);
  
  // Logout function
  const logout = useCallback(() => {
    AuthService.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);
  
  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);
  
  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    clearError,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-50 mb-4">
              Acesso não autorizado
            </h2>
            <p className="text-gray-300">
              Você precisa fazer login para acessar esta página.
            </p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;