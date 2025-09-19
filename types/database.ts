// types/database.ts - VERSÃO DEFINITIVA COM SCHEMA 100% REAL

export interface Database {
  public: {
    Tables: {
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
      // ✅ PACIENTES COM SCHEMA 100% REAL BASEADO NA SUA TABELA
      pacientes: {
        Row: {
          id_paciente: number
          nome_completo: string | null     // ✅ CORRIGIDO: era 'nome'
          cpf: string | null
          data_nascimento: string | null   // date
          celular: string | null
          email: string | null
          genero: string | null
          endereco_completo: string | null // text
          origem_lead: string | null
          status_paciente: string | null
          termo_aceite_dados: boolean | null
          data_ultima_atualizacao: string | null  // timestamp
          consulta_agendada: boolean | null
          id_clinica: number | null
        }
        Insert: {
          id_paciente?: number
          nome_completo?: string | null     // ✅ CORRIGIDO
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
          nome_completo?: string | null     // ✅ CORRIGIDO
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
      // Outras tabelas mantidas...
      skus: {
        Row: {
          id_sku: number
          nome_produto: string
          fabricante: string
          classe_terapeutica: string
          preco_unitario: number
          status_estoque: string
          data_cadastro: string
          id_clinica: number
        }
        Insert: {
          id_sku?: number
          nome_produto: string
          fabricante: string
          classe_terapeutica: string
          preco_unitario: number
          status_estoque?: string
          data_cadastro?: string
          id_clinica: number
        }
        Update: {
          id_sku?: number
          nome_produto?: string
          fabricante?: string
          classe_terapeutica?: string
          preco_unitario?: number
          status_estoque?: string
          data_cadastro?: string
          id_clinica?: number
        }
      }
      lotes: {
        Row: {
          id_lote: number
          id_sku: number
          quantidade_disponivel: number
          validade: string
          data_entrada: string
          id_clinica: number
        }
        Insert: {
          id_lote?: number
          id_sku: number
          quantidade_disponivel: number
          validade: string
          data_entrada?: string
          id_clinica: number
        }
        Update: {
          id_lote?: number
          id_sku?: number
          quantidade_disponivel?: number
          validade?: string
          data_entrada?: string
          id_clinica?: number
        }
      }
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
      // Tabelas adicionais para completude
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
      procedimentos: {
        Row: {
          id_procedimento: number
          id_orcamento: number
          nome_procedimento: string
          valor_procedimento: number
          status_procedimento: string
          data_realizacao: string | null
          id_clinica: number
        }
        Insert: {
          id_procedimento?: number
          id_orcamento: number
          nome_procedimento: string
          valor_procedimento: number
          status_procedimento: string
          data_realizacao?: string | null
          id_clinica: number
        }
        Update: {
          id_procedimento?: number
          id_orcamento?: number
          nome_procedimento?: string
          valor_procedimento?: number
          status_procedimento?: string
          data_realizacao?: string | null
          id_clinica?: number
        }
      }
      dashboard_agregados: {
        Row: {
          id_dashboard: number
          tipo_agregado: string
          dados_json: any
          data_geracao: string
          id_clinica: number
        }
        Insert: {
          id_dashboard?: number
          tipo_agregado: string
          dados_json: any
          data_geracao?: string
          id_clinica: number
        }
        Update: {
          id_dashboard?: number
          tipo_agregado?: string
          dados_json?: any
          data_geracao?: string
          id_clinica?: number
        }
      }
      google_review: {
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
      resumos_diarios_paciente: {
        Row: {
          id_resumo_di: number
          cpf: string
          nome_paciente: string | null
          resumo_interacao: string
          status_processamento: string
          data_resumo: string
          data_criacao: string
          id_clinica: number
        }
        Insert: {
          id_resumo_di?: number
          cpf: string
          nome_paciente?: string | null
          resumo_interacao: string
          status_processamento: string
          data_resumo: string
          data_criacao?: string
          id_clinica: number
        }
        Update: {
          id_resumo_di?: number
          cpf?: string
          nome_paciente?: string | null
          resumo_interacao?: string
          status_processamento?: string
          data_resumo?: string
          data_criacao?: string
          id_clinica?: number
        }
      }
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
    }
  }
}

// Tipos derivados corrigidos
export type Clinica = Database['public']['Tables']['clinicas']['Row']
export type Usuario = Database['public']['Tables']['usuarios_internos']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']  // ✅ Agora com nome_completo
export type Consulta = Database['public']['Tables']['consultas']['Row']
export type Sku = Database['public']['Tables']['skus']['Row']
export type Lote = Database['public']['Tables']['lotes']['Row']
export type Movimentacao = Database['public']['Tables']['movimentacoes_estoque']['Row']
export type Orcamento = Database['public']['Tables']['orcamentos']['Row']
export type Procedimento = Database['public']['Tables']['procedimentos']['Row']
export type ResumosDiarios = Database['public']['Tables']['resumos_diarios_paciente']['Row']
export type ResumosSemanais = Database['public']['Tables']['resumos_semanais_paciente']['Row']

// Interfaces auxiliares corrigidas
export interface PacienteComConsultas extends Paciente {
  consultas?: Consulta[]
  total_consultas?: number
}

// ✅ FORM INTERFACE CORRIGIDA
export interface PacienteForm {
  nome_completo: string        // ✅ CORRIGIDO: era 'nome'
  cpf: string
  data_nascimento?: string
  genero?: string
  celular?: string
  email?: string
  origem_lead?: string
  endereco_completo?: string
  status_paciente?: string
}

// Outros tipos mantidos
export interface UsuarioComClinica extends Usuario {
  clinicas?: Clinica
}

export interface ProdutoComEstoque extends Sku {
  lotes: Lote[]
  estoque_total: number
}

export interface MovimentacaoDetalhada extends Movimentacao {
  lotes: {
    id_sku: number
    validade: string
    skus: {
      nome_produto: string
    }
  }
}