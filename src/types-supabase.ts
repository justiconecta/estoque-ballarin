// Supabase Database Types - Cloud optimized
export interface User {
  id_usuario?: number;
  usuario: string;
  senha?: string;
  nome_completo?: string;
  cpf?: string;
  email?: string;
  role?: string;
}

// Supabase Tables - Exact schema match
export interface SupabaseLote {
  id_lote: number;
  id_sku: number;
  validade: string; // ISO date from Supabase
  quantidade_disponivel: number;
}

export interface SupabaseSku {
  id_sku: number;
  nome_produto: string; // Changed from nome_comercial_produto
  classe_terapeutica: string;
  id_classe_terapeutica: number;
  lotes?: SupabaseLote[];
  classes_terapeuticas?: {
    estoque_minimo_dias: number;
  };
}

export interface SupabaseMovimentacao {
  id_movimentacao: number;
  id_lote: number;
  tipo_movimentacao: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  observacao?: string;
  data_movimentacao: string; // ISO timestamp
  usuario: string;
  lotes?: {
    id_sku: number;
  };
}

// Frontend Compatible Types (transformed from Supabase)
export interface Produto {
  id_sku: number;
  nome_comercial_produto: string; // Mapped from nome_produto
  classe_terapeutica: string;
  estoque_minimo: number;
  lotes: Lote[];
}

export interface Lote {
  id_lote: number;
  validade: string; // MM/YYYY format for frontend
  quantidade: number;
}

export interface Movimentacao {
  id_movimentacao?: number;
  id_lote: number;
  id_sku?: number;
  tipo_movimentacao: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  observacao?: string;
  data_movimentacao: Date | string;
  usuario: string;
}

// Supabase specific tables
export interface SupabasePaciente {
  id_paciente: number;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  celular?: string;
  email?: string;
  genero?: string;
  endereco_completo?: string;
  origem_lead?: string;
  status_paciente?: string;
  data_criacao_registro?: string;
}

export interface SupabaseConsulta {
  id_consulta: number;
  id_paciente: number;
  data_consulta?: string;
  tipo_consulta?: string;
  status_consulta?: string;
  origem?: string;
  pacientes?: {
    nome: string;
  };
}

export interface SupabaseGoogleReview {
  review_id?: number;
  data?: string;
  autor?: string;
  nota?: number;
  sentimento?: 'Positivo' | 'Negativo' | 'Neutro';
  comentario?: string;
}

export interface SupabaseDashboardAgregado {
  id_agregado: number;
  tipo_agregado: string;
  dados_agregados: any; // JSONB from Supabase
  data_referencia: string;
  data_geracao?: string;
}

// API Request/Response Types - unchanged
export interface LoginRequest {
  username: string;
  password: string;
}

export interface MovimentacaoRequest {
  id_sku: number;
  quantidade: number;
  usuario?: string;
  id_lote?: number;
  validade?: string; // MM/YYYY format
}

export interface DashboardRequest {
  month: string; // YYYY-MM format
}

// Dashboard Analytics Types - unchanged
export interface PacienteRanking {
  cpf: string;
  nome_paciente?: string;
  total_resumos: number;
}

export interface TopItem {
  item: string;
  count: number;
  percentage: number;
}

export interface DashboardData {
  totalPacientes: number;
  pacientesAtivosMes: number;
  pacientesAtivosTotal: number;
  mediaMensal: number;
  mediaGoogleReviews: string;
  totalReviews: number;
  reviewsPositivas: number;
  reviewsNegativas: number;
  rankingResumos: PacienteRanking[];
  topEfeitosAdversos: TopItem[];
  topFatoresSucesso: TopItem[];
  topMelhorias: TopItem[];
  topSupervalorizados: TopItem[];
  fonteUsuarios: TopItem[];
  temasMarketing: string;
  oportunidadesMarketing: string;
  observacoes: string;
}

// Supabase Client Types
export interface SupabaseConfig {
  url: string;
  serviceKey: string;
  anonKey?: string;
}

// Utility Types
export type ScreenType = 'login' | 'estoque' | 'dashboard';

export interface ModalData {
  type: 'success' | 'error';
  title: string;
  message: string;
}

// Data Transformation Helpers
export interface DataMappers {
  supabaseSkuToProduto: (sku: SupabaseSku) => Produto;
  supabaseMovimentacaoToMovimentacao: (mov: SupabaseMovimentacao) => Movimentacao;
  formatDateToMMYYYY: (isoDate: string) => string;
  parseMMYYYYToISO: (mmyyyy: string) => string;
}

// Error Types for Supabase
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: SupabaseError;
  success: boolean;
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'supabase';
  connection: 'connected' | 'disconnected';
  tables_count: number;
  timestamp: string;
  project: string;
}