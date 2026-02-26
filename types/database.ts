// types/database.ts

export interface Database {
  public: {
    Tables: {

      servicos: {
        Row: Servico
        Insert: Omit<Servico, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: number
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Servico, 'id' | 'id_clinica'>>
      }

      despesas: {
        Row: Despesa
        Insert: Omit<Despesa, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: number
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Despesa, 'id' | 'id_clinica'>>
      }

      profissionais: {
        Row: Profissional
        Insert: Omit<Profissional, 'id' | 'criado_em'> & {
          id?: number
          ativo?: boolean
          criado_em?: string
        }
        Update: Partial<Omit<Profissional, 'id' | 'id_clinica'>>
      }

      parametros: {
        Row: Parametros
        Insert: Omit<Parametros, 'atualizado_em'> & {
          atualizado_em?: string
        }
        Update: Partial<Omit<Parametros, 'id_clinica'>>
      }

      vendas: {
        Row: Venda
        Insert: Omit<Venda, 'id' | 'criado_em'> & {
          id?: number
          criado_em?: string
        }
        Update: Partial<Omit<Venda, 'id' | 'id_clinica'>>
      }

      venda_insumos: {
        Row: VendaInsumo
        Insert: Omit<VendaInsumo, 'id'> & {
          id?: number
        }
        Update: Partial<Omit<VendaInsumo, 'id'>>
      }

      // Clínicas
      clinicas: {
        Row: {
          id_clinica: number
          nome_clinica: string
          cnpj: string | null
          endereco: string | null
          telefone: string | null
          email: string | null
          plano: string
          ativa: boolean
          data_cadastro: string
        }
        Insert: {
          id_clinica?: number
          nome_clinica: string
          cnpj?: string | null
          endereco?: string | null
          telefone?: string | null
          email?: string | null
          plano?: string
          ativa?: boolean
          data_cadastro?: string
        }
        Update: {
          id_clinica?: number
          nome_clinica?: string
          cnpj?: string | null
          endereco?: string | null
          telefone?: string | null
          email?: string | null
          plano?: string
          ativa?: boolean
          data_cadastro?: string
        }
      }

      // Usuários
      usuarios_internos: {
        Row: {
          id_usuario: number
          usuario: string
          senha: string
          nome_completo: string
          email: string
          role: string
          id_clinica: number
        }
        Insert: {
          id_usuario?: number
          usuario: string
          senha: string
          nome_completo: string
          email: string
          role?: string
          id_clinica: number
        }
        Update: {
          id_usuario?: number
          usuario?: string
          senha?: string
          nome_completo?: string
          email?: string
          role?: string
          id_clinica?: number
        }
      }

      // ✅ PACIENTES COM SCHEMA 100% REAL
      pacientes: {
        Row: {
          id_paciente: number
          nome_completo: string | null
          cpf: string | null
          data_nascimento: string | null
          celular: string | null
          email: string | null
          genero: string | null
          endereco_completo: string | null
          origem_lead: string | null
          status_paciente: string | null
          termo_aceite_dados: boolean | null
          data_ultima_atualizacao: string | null
          consulta_agendada: boolean | null
          id_clinica: number | null
        }
        Insert: {
          id_paciente?: number
          nome_completo?: string | null
          cpf?: string | null
          data_nascimento?: string | null
          celular?: string | null
          email?: string | null
          genero?: string | null
          endereco_completo?: string | null
          origem_lead?: string | null
          status_paciente?: string | null
          termo_aceite_dados?: boolean | null
          data_ultima_atualizacao?: string | null
          consulta_agendada?: boolean | null
          id_clinica?: number | null
        }
        Update: {
          id_paciente?: number
          nome_completo?: string | null
          cpf?: string | null
          data_nascimento?: string | null
          celular?: string | null
          email?: string | null
          genero?: string | null
          endereco_completo?: string | null
          origem_lead?: string | null
          status_paciente?: string | null
          termo_aceite_dados?: boolean | null
          data_ultima_atualizacao?: string | null
          consulta_agendada?: boolean | null
          id_clinica?: number | null
        }
      }

      // Consultas
      consultas: {
        Row: {
          id_consulta: number
          id_paciente: number
          data_agendamento: string
          data_consulta: string | null
          tipo_consulta: string
          status_consulta: string
          origem: string
          relato_queixa_inicial: string | null
          feedback_pos_consulta: string | null
          status_consulta_enum: string
          mes_ano: string | null
          supervalorizado: boolean
          data_cadastro: string
          id_clinica: number
        }
        Insert: {
          id_consulta?: number
          id_paciente: number
          data_agendamento: string
          data_consulta?: string | null
          tipo_consulta: string
          status_consulta: string
          origem: string
          relato_queixa_inicial?: string | null
          feedback_pos_consulta?: string | null
          status_consulta_enum?: string
          mes_ano?: string | null
          supervalorizado?: boolean
          data_cadastro?: string
          id_clinica: number
        }
        Update: {
          id_consulta?: number
          id_paciente?: number
          data_agendamento?: string
          data_consulta?: string | null
          tipo_consulta?: string
          status_consulta?: string
          origem?: string
          relato_queixa_inicial?: string | null
          feedback_pos_consulta?: string | null
          status_consulta_enum?: string
          mes_ano?: string | null
          supervalorizado?: boolean
          data_cadastro?: string
          id_clinica?: number
        }
      }

      // ✅ SKUs - CORRIGIDO: valor_venda em vez de preco_unitario
      skus: {
        Row: {
          id_sku: number
          nome_produto: string
          fabricante: string
          classe_terapeutica: string
          valor_venda: number
          status_estoque: string
          data_cadastro: string
          fator_divisao: string
          id_clinica: number
        }
        Insert: {
          id_sku?: number
          nome_produto: string
          fabricante: string
          classe_terapeutica: string
          valor_venda: number
          status_estoque?: string
          data_cadastro?: string
          fator_divisao?: string
          id_clinica: number
        }
        Update: {
          id_sku?: number
          nome_produto?: string
          fabricante?: string
          classe_terapeutica?: string
          valor_venda?: number
          status_estoque?: string
          data_cadastro?: string
          fator_divisao?: string
          id_clinica?: number
        }
      }

      // Lotes - preco_unitario aqui é CUSTO do lote (correto)
      lotes: {
        Row: {
          id_lote: number
          id_sku: number
          quantidade_disponivel: number
          validade: string
          data_entrada: string
          preco_unitario: number
          id_clinica: number
        }
        Insert: {
          id_lote?: number
          id_sku: number
          quantidade_disponivel: number
          validade: string
          data_entrada?: string
          preco_unitario: number
          id_clinica: number
        }
        Update: {
          id_lote?: number
          id_sku?: number
          quantidade_disponivel?: number
          validade?: string
          data_entrada?: string
          preco_unitario?: number
          id_clinica?: number
        }
      }

      // Movimentações
      movimentacoes_estoque: {
        Row: {
          id_movimentacao: number
          id_lote: number
          tipo_movimentacao: string
          quantidade: number
          usuario: string
          observacao: string | null
          data_movimentacao: string
          id_clinica: number
        }
        Insert: {
          id_movimentacao?: number
          id_lote: number
          tipo_movimentacao: string
          quantidade: number
          usuario: string
          observacao?: string | null
          data_movimentacao?: string
          id_clinica: number
        }
        Update: {
          id_movimentacao?: number
          id_lote?: number
          tipo_movimentacao?: string
          quantidade?: number
          usuario?: string
          observacao?: string | null
          data_movimentacao?: string
          id_clinica?: number
        }
      }

      // Orçamentos
      orcamentos: {
        Row: {
          id_orcamento: number
          id_consulta: number
          id_paciente: number
          data_emissao_orcamento: string
          valor_total_orcamento: number
          numero_sessoes: number
          descricao_tratamento: string
          status_orcamento: string
          data_aprovacao_orcamento: string | null
          id_clinica: number
        }
        Insert: {
          id_orcamento?: number
          id_consulta: number
          id_paciente: number
          data_emissao_orcamento: string
          valor_total_orcamento: number
          numero_sessoes: number
          descricao_tratamento: string
          status_orcamento: string
          data_aprovacao_orcamento?: string | null
          id_clinica: number
        }
        Update: {
          id_orcamento?: number
          id_consulta?: number
          id_paciente?: number
          data_emissao_orcamento?: string
          valor_total_orcamento?: number
          numero_sessoes?: number
          descricao_tratamento?: string
          status_orcamento?: string
          data_aprovacao_orcamento?: string | null
          id_clinica?: number
        }
      }

      // Procedimentos
      procedimentos: {
        Row: {
          id_procedimento: number
          id_consulta: number
          id_paciente: number
          id_sku: number
          data_procedimento: string
          area_aplicacao: string
          quantidade_unidades: number
          preco_cobrado: number
          observacoes: string | null
          id_clinica: number
        }
        Insert: {
          id_procedimento?: number
          id_consulta: number
          id_paciente: number
          id_sku: number
          data_procedimento: string
          area_aplicacao: string
          quantidade_unidades: number
          preco_cobrado: number
          observacoes?: string | null
          id_clinica: number
        }
        Update: {
          id_procedimento?: number
          id_consulta?: number
          id_paciente?: number
          id_sku?: number
          data_procedimento?: string
          area_aplicacao?: string
          quantidade_unidades?: number
          preco_cobrado?: number
          observacoes?: string | null
          id_clinica?: number
        }
      }

      // Reviews
      reviews_google: {
        Row: {
          id_review: number
          autor: string
          nota: number
          comentario: string
          data_review: string
          id_clinica: number
        }
        Insert: {
          id_review?: number
          autor: string
          nota: number
          comentario: string
          data_review?: string
          id_clinica: number
        }
        Update: {
          id_review?: number
          autor?: string
          nota?: number
          comentario?: string
          data_review?: string
          id_clinica?: number
        }
      }

      // Resumos Diários
      resumos_diarios_paciente: {
        Row: {
          id_resumo_diario: number
          cpf: string
          nome_paciente: string | null
          resumo_interacoes: string
          status_processamento: string
          data_resumo: string
          data_criacao: string
          id_clinica: number
        }
        Insert: {
          id_resumo_diario?: number
          cpf: string
          nome_paciente?: string | null
          resumo_interacoes: string
          status_processamento: string
          data_resumo: string
          data_criacao?: string
          id_clinica: number
        }
        Update: {
          id_resumo_diario?: number
          cpf?: string
          nome_paciente?: string | null
          resumo_interacoes?: string
          status_processamento?: string
          data_resumo?: string
          data_criacao?: string
          id_clinica?: number
        }
      }

      // Resumos Semanais
      resumos_semanais_paciente: {
        Row: {
          id_resumo_sem: number
          cpf: string
          nome_paciente: string | null
          data_inicio_semana: string
          data_fim_semana: string
          resumo_geral_semana: string
          data_geracao: string
          id_clinica: number
        }
        Insert: {
          id_resumo_sem?: number
          cpf: string
          nome_paciente?: string | null
          data_inicio_semana: string
          data_fim_semana: string
          resumo_geral_semana: string
          data_geracao?: string
          id_clinica: number
        }
        Update: {
          id_resumo_sem?: number
          cpf?: string
          nome_paciente?: string | null
          data_inicio_semana?: string
          data_fim_semana?: string
          resumo_geral_semana?: string
          data_geracao?: string
          id_clinica?: number
        }
      }

      // Configuração de Retornos
      config_retornos: {
        Row: ConfigRetorno
        Insert: Omit<ConfigRetorno, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: number
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<ConfigRetorno, 'id'>>
      }

      // Controle de Retornos
      controle_retornos: {
        Row: ControleRetorno
        Insert: Omit<ControleRetorno, 'id' | 'criado_em' | 'atualizado_em' | 'id_venda_retorno' | 'data_retorno_efetivo' | 'observacoes'> & {
          id?: number
          criado_em?: string
          atualizado_em?: string
          id_venda_retorno?: number | null
          data_retorno_efetivo?: string | null
          observacoes?: string | null
        }
        Update: Partial<Omit<ControleRetorno, 'id' | 'id_clinica'>>
      }

      // Procedimentos Pendentes / Upsell
      procedimentos_pendentes: {
        Row: ProcedimentoPendente
        Insert: Omit<ProcedimentoPendente, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: number
          sugerido_em?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<ProcedimentoPendente, 'id' | 'id_clinica'>>
      }
    }
  }
}

// ============ INTERFACES DE DOMÍNIO ============

export interface Servico {
  [x: string]: any
  id: number
  id_clinica: number
  nome: string
  preco: number
  custo_insumos: number
  custo_equip: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// ✅ ATUALIZADO: Campo tipo adicionado
export interface Despesa {
  id: number
  id_clinica: number
  tipo: 'Despesa Fixa' | 'Custo Fixo' | 'Despesa Variável' | 'Custo Variável' | null
  categoria: string
  item: string
  valor_mensal: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
  periodo: string | null  // DATE no banco (YYYY-MM-DD)
}

// ✅ FIX BUG 5: Adicionado campo duracao_servico
export interface Profissional {
  id: number
  id_clinica: number
  nome: string
  horas_semanais: number
  ativo: boolean
  criado_em: string
  percentual_profissional: number | null 
  perfil: 'proprietario' | 'comissionado' | null 
  duracao_servico: number | null  // ✅ NOVO CAMPO - duração individual do serviço em horas
}

export interface Parametros {
  id_clinica: number
  numero_salas: number
  horas_trabalho_dia: number
  duracao_media_servico_horas: number
  mod_padrao: number
  aliquota_impostos_pct: number
  taxa_cartao_pct: number
  meta_resultado_liquido_mensal: number
  atualizado_em: string
  modern_inova: number | null              
  fator_correcao_marca: number | null      
  custo_hora: number | null                
}

export type PerfilProfissional = 'proprietario' | 'comissionado'

export const PERFIS_PROFISSIONAL: PerfilProfissional[] = [
  'proprietario',
  'comissionado'
]

export interface Venda {
  id: number
  id_clinica: number
  id_paciente: number
  id_usuario_responsavel: number | null
  data_venda: string
  metodo_pagamento: 'PIX' | 'Débito' | 'Crédito'
  parcelas: number | null
  preco_total: number
  custo_total: number
  margem_total: number
  custo_taxa_cartao: number
  valor_entrada: number
  valor_parcelado: number
  margem_percentual: number
  margem_percentual_final: number
  margem_total_final: number
  desconto_valor: number
  desconto_percentual: number
  preco_final: number
  criado_em: string
  items: Array<{ id: number; qtd: number }> | null  // ✅ Campo JSONB
}

export interface VendaInsumo {
  id: number
  id_venda: number
  id_lote: number
  quantidade: number
  custo_total: number
  valor_venda_total: number
}

// Deprecated - mantido para compatibilidade
export interface VendaServico {
  id: number
  id_venda: number
  id_servico: number
  quantidade: number
  preco_no_momento: number
  custo_insumos_no_momento: number
  mod_aplicado_no_momento: number
  custo_equip_no_momento: number
}

export interface ServicoCalculado extends Servico {
  margemContribuicao: number
  margemContribuicaoPct: number
}

export interface VendaDetalhada extends Venda {
  paciente?: {
    nome_completo: string
    cpf: string
  }
  insumos?: VendaInsumo[]
  servicos?: VendaServico[]
}

// ============ TIPOS DERIVADOS ============

export type Clinica = Database['public']['Tables']['clinicas']['Row']
export type Usuario = Database['public']['Tables']['usuarios_internos']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']
export type Consulta = Database['public']['Tables']['consultas']['Row']
export type Sku = Database['public']['Tables']['skus']['Row']
export type Lote = Database['public']['Tables']['lotes']['Row']
export type Movimentacao = Database['public']['Tables']['movimentacoes_estoque']['Row']
export type Orcamento = Database['public']['Tables']['orcamentos']['Row']
export type Procedimento = Database['public']['Tables']['procedimentos']['Row']
export type ResumosDiarios = Database['public']['Tables']['resumos_diarios_paciente']['Row']
export type ResumosSemanais = Database['public']['Tables']['resumos_semanais_paciente']['Row']

// ============ INTERFACES AUXILIARES ============

export interface PacienteComConsultas extends Paciente {
  consultas?: Consulta[]
  total_consultas?: number
}

export interface PacienteForm {
  nome_completo: string
  cpf: string
  data_nascimento?: string
  genero?: string
  celular?: string
  email?: string
  origem_lead?: string
  endereco_completo?: string
  status_paciente?: string
}

export interface UsuarioComClinica extends Usuario {
  clinicas?: Clinica
}

export interface ProdutoComEstoque extends Sku {
  fator_divisao: string
  lotes: Lote[]
  estoque_total: number
}

export interface MovimentacaoDetalhada extends Movimentacao {
  lote: any
  lotes: {
    id_sku: number
    validade: string
    skus: {
      nome_produto: string
    }
  }
}

// ✅ TIPOS DE DESPESA - Enum para uso no frontend
export type TipoDespesa = 'Despesa Fixa' | 'Custo Fixo' | 'Despesa Variável' | 'Custo Variável'

export const TIPOS_DESPESA: TipoDespesa[] = [
  'Despesa Fixa',
  'Custo Fixo',
  'Despesa Variável',
  'Custo Variável'
]

// ============ RETORNOS — INTERFACES ============

export type StatusRetorno = 'pendente' | 'contactado' | 'confirmado' | 'atrasado' | 'cancelado'
export type StatusProcedimentoPendente = 'pendente' | 'contactado' | 'agendado' | 'realizado' | 'cancelado'

export interface ConfigRetorno {
  id: number
  id_clinica: number
  classe_terapeutica: string
  meses_retorno: number
  prioridade: number
  dias_antecedencia_contato: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface ControleRetorno {
  id: number
  id_clinica: number
  id_paciente: number
  id_venda_origem: number
  id_sku: number
  classe_terapeutica: string
  data_procedimento: string
  data_retorno_prevista: string
  data_contato_sugerida: string
  prioridade: number
  status: StatusRetorno
  id_venda_retorno: number | null
  data_retorno_efetivo: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export interface ProcedimentoPendente {
  id: number
  id_clinica: number
  id_paciente: number
  procedimento_sugerido: string
  motivo: string | null
  id_sku_sugerido: number | null
  sugerido_em: string
  sugerido_por: number | null
  status: StatusProcedimentoPendente
  data_contato: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export interface RetornoDashboard {
  id_paciente: number
  nome: string
  celular: string | null
  email: string | null
  data_retorno_mais_proxima: string | null
  data_contato_mais_proxima: string | null
  produto_retorno_proximo: string | null
  classe_retorno_proximo: string | null
  prioridade_retorno_proximo: number | null
  todos_retornos: Array<{
    id: number
    produto: string
    classe: string
    data_retorno: string
    data_contato: string
    status: string
    data_procedimento: string
  }> | null
  qtd_retornos_pendentes: number
  qtd_atrasados: number
  qtd_pendentes: number
  qtd_confirmados: number
  qtd_upsell: number
  upsell_lista: Array<{
    procedimento: string
    motivo: string
    sugerido_em: string
  }> | null
  ultima_compra: string | null
  valor_total: number | null
  status_consolidado: string
  dias_para_retorno: number | null
}