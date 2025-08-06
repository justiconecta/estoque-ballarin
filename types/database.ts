// TIPOS ATUALIZADOS com id_clinica em PACIENTES
export interface Database {
  public: {
    Tables: {
      // Nova tabela de clínicas
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
      // Usuários com id_clinica
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
      // ⭐ PACIENTES ATUALIZADO COM id_clinica ⭐
      pacientes: {
        Row: {
          id_paciente: number
          nome: string
          cpf: string
          data_nascimento: string
          sexo: string
          telefone: string
          email: string
          origem_lead: string
          data_cadastro: string
          id_clinica: number  // ← NOVA COLUNA
        }
        Insert: {
          id_paciente?: number
          nome: string
          cpf: string
          data_nascimento?: string
          sexo?: string
          telefone?: string
          email?: string
          origem_lead?: string
          data_cadastro?: string
          id_clinica: number  // ← NOVA COLUNA OBRIGATÓRIA
        }
        Update: {
          id_paciente?: number
          nome?: string
          cpf?: string
          data_nascimento?: string
          sexo?: string
          telefone?: string
          email?: string
          origem_lead?: string
          data_cadastro?: string
          id_clinica?: number  // ← NOVA COLUNA
        }
      }
      // Consultas com id_clinica
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
          id_clinica: number  // ← NOVA COLUNA
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
          id_clinica: number  // ← NOVA COLUNA OBRIGATÓRIA
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
      // SKUs com id_clinica
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
      // Lotes com id_clinica
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
      // Movimentações com id_clinica
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
      // Orçamentos com id_clinica
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
      // Classes terapêuticas com id_clinica
      classes_terapeuticas: {
        Row: {
          id_classe_terapeutica: number
          nome: string
          estoque_minimo_dias: number
          id_clinica: number
        }
        Insert: {
          id_classe_terapeutica?: number
          nome: string
          estoque_minimo_dias: number
          id_clinica: number
        }
        Update: {
          id_classe_terapeutica?: number
          nome?: string
          estoque_minimo_dias?: number
          id_clinica?: number
        }
      }
      // Fornecedores com id_clinica
      fornecedores: {
        Row: {
          id_fornecedor: number
          cnpj: string
          razao_social: string
          nome_fantasia: string
          consultor_nome: string
          consultor_whatsapp: string
          consultor_email: string
          status: string
          data_cadastro: string
          id_clinica: number
        }
        Insert: {
          id_fornecedor?: number
          cnpj: string
          razao_social: string
          nome_fantasia: string
          consultor_nome: string
          consultor_whatsapp: string
          consultor_email: string
          status?: string
          data_cadastro?: string
          id_clinica: number
        }
        Update: {
          id_fornecedor?: number
          cnpj?: string
          razao_social?: string
          nome_fantasia?: string
          consultor_nome?: string
          consultor_whatsapp?: string
          consultor_email?: string
          status?: string
          data_cadastro?: string
          id_clinica?: number
        }
      }
      // Demais tabelas com id_clinica (para completude)
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
    }
  }
}

// Tipos derivados atualizados
export type Clinica = Database['public']['Tables']['clinicas']['Row']
export type Usuario = Database['public']['Tables']['usuarios_internos']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']  // ⭐ AGORA COM id_clinica
export type Consulta = Database['public']['Tables']['consultas']['Row']
export type Sku = Database['public']['Tables']['skus']['Row']
export type Lote = Database['public']['Tables']['lotes']['Row']
export type Movimentacao = Database['public']['Tables']['movimentacoes_estoque']['Row']
export type Orcamento = Database['public']['Tables']['orcamentos']['Row']
export type Procedimento = Database['public']['Tables']['procedimentos']['Row']

// Tipos compostos com relacionamentos
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

// ⭐ NOVOS TIPOS PARA PACIENTES ⭐
export interface PacienteComConsultas extends Paciente {
  consultas?: Consulta[]
  total_consultas?: number
}

export interface PacienteForm {
  nome: string
  cpf: string
  data_nascimento?: string
  sexo?: string
  telefone?: string
  email?: string
  origem_lead?: string
}

// Tipos para formulários multi-tenant
export interface NovaMovimentacao {
  id_lote: number
  tipo_movimentacao: 'ENTRADA' | 'SAIDA'
  quantidade: number
  usuario: string
  observacao?: string
  // id_clinica será adicionado automaticamente
}

export interface NovoLote {
  id_sku: number
  quantidade_disponivel: number
  validade: string
  // id_clinica será adicionado automaticamente
}

export interface NovoPaciente {
  nome: string
  cpf: string
  data_nascimento?: string
  sexo?: string
  telefone?: string
  email?: string
  origem_lead?: string
  // id_clinica será adicionado automaticamente
}