// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  tenant: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant: string;
  permissions: Permission[];
  avatarUrl?: string;
  lastLogin?: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
  refreshToken: string;
}

// User Roles & Permissions
export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

// Tenant Configuration
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  theme: TenantTheme;
  settings: TenantSettings;
  isActive: boolean;
}

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

export interface TenantSettings {
  maxUsers: number;
  features: string[];
  billing: {
    plan: 'basic' | 'premium' | 'enterprise';
    isActive: boolean;
  };
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Dashboard Specific Types
export interface DashboardMetrics {
  totalPatients: number;
  activePatients: number;
  avgPatientsMonth: number;
  topPatientsBySummaries: PatientRanking[];
  adverseEffects: AdverseEffect[];
  successFactors: SuccessFactor[];
  improvements: Improvement[];
  overvaluedAspects: OvervaluedAspect[];
  userSources: UserSource[];
  marketingTopics: string[];
  contentOpportunities: string[];
  observations: string;
}

export interface PatientRanking {
  cpf: string;
  name: string;
  summaryCount: number;
  lastActivity: Date;
}

export interface AdverseEffect {
  effect: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface SuccessFactor {
  factor: string;
  frequency: number;
  impact: number;
}

export interface Improvement {
  area: string;
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface OvervaluedAspect {
  aspect: string;
  frequency: number;
  realValue: number;
}

export interface UserSource {
  source: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}