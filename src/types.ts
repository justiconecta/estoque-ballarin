// User Authentication
export interface User {
  id?: number;
  usuario: string;
  senha?: string;
  role?: string;
}

// Estoque Types
export interface Lote {
  id_lote: number;
  validade: string; // MM/AAAA format
  quantidade: number;
}

export interface Produto {
  id_sku: number;
  nome_comercial_produto: string;
  classe_terapeutica: string;
  estoque_minimo: number;
  lotes: Lote[];
}

export interface Movimentacao {
  id?: number;
  id_sku: number;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  observacao?: string;
  data: Date | string;
  usuario: string;
  id_lote?: number;
}

// Dashboard Analytics Types
export interface PacienteRanking {
  cpf: string;
  total_resumos: number;
}

export interface TopItem {
  item: string;
  count: number;
  percentage: number;
}

export interface DashboardData {
  // Main Metrics
  totalPacientes: number;
  pacientesAtivosMes: number;
  pacientesAtivosTotal: number;
  mediaMensal: number;
  
  // Rankings and Tops
  rankingResumos: PacienteRanking[];
  topEfeitosAdversos: TopItem[];
  topFatoresSucesso: TopItem[];
  topMelhorias: TopItem[];
  topSupervalorizados: TopItem[];
  fonteUsuarios: TopItem[];
  
  // Marketing Content
  temasMarketing: string;
  oportunidadesMarketing: string;
  observacoes: string;
}

// Database Query Results
export interface PacienteCount {
  count: number;
}

export interface SessionCount {
  session_count: number;
  month?: string;
}

export interface ResumoIndicadores {
  id?: number;
  mes_referencia: string;
  efeitos_adversos: string;
  fcs: string; // fatores_sucesso
  melhorias: string;
  supervalorizado: string;
  origem: string;
  temas_marketing: string;
  oportunidades_marketing: string;
  observacoes: string;
  created_at?: Date;
}

// API Request/Response Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface MovimentacaoRequest {
  id_sku: number;
  quantidade: number;
  usuario?: string;
  id_lote?: number;
  validade?: string;
}

export interface DashboardRequest {
  month: string; // YYYY-MM format
}

// Database Connection Types
export interface DBConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

// Utility Types
export type ScreenType = 'login' | 'estoque' | 'dashboard';

export interface ModalData {
  type: 'success' | 'error';
  title: string;
  message: string;
}