// User Authentication - CORRIGIDO para usuarios_internos
export interface User {
  id_usuario?: number;
  usuario: string;
  senha?: string;
  nome_completo?: string;
  cpf?: string;
  email?: string;
  role?: string;
}

// Estoque Types - CORRIGIDOS para schema real
export interface Lote {
  id_lote: number;
  validade: string; // MM/YYYY format from database DATE
  quantidade: number; // quantidade_disponivel from DB
}

export interface Produto {
  id_sku: number; // produtos_sku table
  nome_comercial_produto: string;
  classe_terapeutica: string; // from classes_terapeuticas join
  estoque_minimo: number; // estoque_minimo_dias from classes_terapeuticas
  lotes: Lote[];
}

export interface ClasseTerapeutica {
  id_classe_terapeutica: number;
  nome: string;
  estoque_minimo_dias: number;
}

export interface Movimentacao {
  id_movimentacao?: number; // id from movimentacoes_estoque
  id_lote: number;
  id_sku?: number; // derived from lotes join
  tipo_movimentacao: 'ENTRADA' | 'SAIDA'; // real DB values
  quantidade: number;
  observacao?: string;
  data_movimentacao: Date | string;
  usuario: string;
}

// NEW: Pacientes Types
export interface Paciente {
  id_paciente: number;
  nome_completo: string;
  cpf: string;
  data_nascimento?: Date;
  celular?: string;
  email?: string;
  genero?: string;
  endereco_completo?: string;
  origem_lead?: string;
  status_paciente?: string;
  termo_aceite_dados?: boolean;
  avalia_google?: boolean;
  data_criacao_registro?: Date;
  data_ultima_atualizacao?: Date;
}

// NEW: Consultas Types
export interface Consulta {
  id_consulta: number;
  id_paciente: number;
  data_agendamento?: Date;
  data_consulta?: Date;
  tipo_consulta?: string;
  relato_queixas_triagem?: string;
  feedback_pos_consulta?: string;
  status_consulta?: string;
  origem?: string;
  fcs?: string[];
  melhorias?: string[];
  supervalorizado?: string[];
  nextday?: boolean;
}

// NEW: Google Reviews Types
export interface GoogleReview {
  review_id: number;
  data?: Date;
  autor?: string;
  nota?: number;
  sentimento?: 'Positivo' | 'Negativo' | 'Neutro';
  comentario?: string;
}

// NEW: Dashboard Agregados Types
export interface DashboardAgregado {
  id_agregado: number;
  tipo_agregado: string;
  dados_agregados: any; // JSONB
  data_referencia: Date;
  data_geracao?: Date;
}

// Enhanced Dashboard Analytics Types
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

// ENHANCED Dashboard Data - with real database integration
export interface DashboardData {
  // Main Metrics
  totalPacientes: number;
  pacientesAtivosMes: number;
  pacientesAtivosTotal: number;
  mediaMensal: number;
  
  // Google Reviews Integration
  mediaGoogleReviews: string;
  totalReviews: number;
  reviewsPositivas: number;
  reviewsNegativas: number;
  
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

// NEW: Orçamentos Types
export interface Orcamento {
  id_orcamento: number;
  id_consulta: number;
  id_paciente: number;
  data_emissao_orcamento: Date;
  valor_total_orcamento: number;
  numero_sessoes?: number;
  descricao_tratamento?: string;
  status_orcamento?: string;
  data_aprovacao_orcamento?: Date;
}

// NEW: Fornecedores Types
export interface Fornecedor {
  id_fornecedor: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  consultor_nome?: string;
  consultor_whatsapp?: string;
  consultor_email?: string;
  status?: string;
  data_cadastro?: Date;
}

// NEW: Propostas Types
export interface Proposta {
  id_proposta: number;
  id_fornecedor: number;
  nome_comercial_produto: string;
  classe_terapeutica: string;
  preco_unidade: number;
  condicoes_pagamento?: string;
  prazo_entrega_dias?: number;
  data_validade_lote?: string;
  volume_minimo_compra?: number;
  validade_proposta_horas?: number;
  bonus_condicao_unidades?: number;
  bonus_ganho_unidades?: number;
  diferenciais_competitivos?: string;
  data_proposta?: Date;
}

// NEW: Chat Logs Types
export interface PacienteChatLog {
  id: number;
  session_id: string; // CPF format
  contexto_agente: string;
  message: any; // JSONB
  created_on: Date;
}

export interface FornecedorChatLog {
  id: number;
  session_id: string; // CNPJ format
  message: any; // JSONB
  created_on: Date;
}

// NEW: Resumos Types
export interface ResumoDiarioPaciente {
  id_resumo_diario: number;
  cpf: string;
  nome_paciente?: string;
  resumo_interacoes?: string;
  status_processamento?: string;
  data_resumo: Date;
  data_criacao?: Date;
}

export interface ResumoSemanalPaciente {
  id_resumo_semanal: number;
  cpf: string;
  nome_paciente?: string;
  data_inicio_semana: Date;
  data_fim_semana: Date;
  indicadores_clinicos?: any; // JSONB
  indicadores_negocio?: any; // JSONB
  resumo_geral_semana?: string;
  ids_resumos_diarios_utilizados?: number[];
  data_geracao?: Date;
}

// NEW: Histórico Consumo Types
export interface HistoricoConsumoMensal {
  id_historico: number;
  id_classe_terapeutica: number;
  mes_ano: string; // YYYY-MM format
  unidades_consumidas: number;
  data_registro?: Date;
}

// NEW: Tópicos Marketing Types
export interface TopicoMensal {
  id_topico: number;
  especialidade?: string;
  topico?: string;
  ranking?: string;
  mes: string; // YYYY-MM format
  justificativa_oportunidade?: any; // JSONB
  data_geracao?: Date;
}

// Database Query Results - UPDATED
export interface PacienteCount {
  count: number;
}

export interface SessionCount {
  session_count: number;
  month?: string;
}

// API Request/Response Types - UPDATED
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

// NEW: Enhanced API Responses
export interface ConsultaWithPaciente extends Consulta {
  nome_completo?: string; // from pacientes join
}

export interface MovimentacaoWithDetails extends Movimentacao {
  nome_comercial_produto?: string; // from produtos_sku join
  classe_terapeutica?: string; // from classes_terapeuticas join
}

// NEW: Analytics Types
export interface AnalyticsData {
  procedimentosMaisRealizados: TopItem[];
  origemPacientes: TopItem[];
  satisfacaoMedia: number;
  taxaConversao: number;
  ticketMedio: number;
}

// NEW: Inventory Analytics
export interface EstoqueCritico {
  id_sku: number;
  nome_comercial_produto: string;
  classe_terapeutica: string;
  quantidade_atual: number;
  estoque_minimo_dias: number;
  cobertura_dias: number;
  status_criticidade: 'CRITICO' | 'ATENCAO' | 'OK';
}