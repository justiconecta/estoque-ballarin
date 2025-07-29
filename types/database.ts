export interface Database {
  public: {
    Tables: {
      usuarios_internos: {
        Row: {
          id_usuario: number
          usuario: string
          senha: string
          nome_completo: string
          email: string
          role: string
        }
        Insert: {
          id_usuario?: number
          usuario: string
          senha: string
          nome_completo: string
          email: string
          role?: string
        }
        Update: {
          id_usuario?: number
          usuario?: string
          senha?: string
          nome_completo?: string
          email?: string
          role?: string
        }
      }
      skus: {
        Row: {
          id_sku: number
          nome_produto: string
          fabricante: string
          classe_terapeutica: string
          preco_unitario: number
          status_estoque: string
          data_cadastro: string
        }
        Insert: {
          id_sku?: number
          nome_produto: string
          fabricante: string
          classe_terapeutica: string
          preco_unitario: number
          status_estoque?: string
          data_cadastro?: string
        }
        Update: {
          id_sku?: number
          nome_produto?: string
          fabricante?: string
          classe_terapeutica?: string
          preco_unitario?: number
          status_estoque?: string
          data_cadastro?: string
        }
      }
      lotes: {
        Row: {
          id_lote: number
          id_sku: number
          quantidade_disponivel: number
          validade: string
          data_entrada: string
        }
        Insert: {
          id_lote?: number
          id_sku: number
          quantidade_disponivel: number
          validade: string
          data_entrada?: string
        }
        Update: {
          id_lote?: number
          id_sku?: number
          quantidade_disponivel?: number
          validade?: string
          data_entrada?: string
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
        }
        Insert: {
          id_movimentacao?: number
          id_lote: number
          tipo_movimentacao: string
          quantidade: number
          usuario: string
          observacao?: string | null
          data_movimentacao?: string
        }
        Update: {
          id_movimentacao?: number
          id_lote?: number
          tipo_movimentacao?: string
          quantidade?: number
          usuario?: string
          observacao?: string | null
          data_movimentacao?: string
        }
      }
      classes_terapeuticas: {
        Row: {
          id_classe_terapeutica: number
          nome: string
          estoque_minimo_dias: number
        }
        Insert: {
          id_classe_terapeutica?: number
          nome: string
          estoque_minimo_dias: number
        }
        Update: {
          id_classe_terapeutica?: number
          nome?: string
          estoque_minimo_dias?: number
        }
      }
      historico_consumo_mensal: {
        Row: {
          id_historico: number
          id_classe_terapeutica: number
          mes_ano: string
          unidades_consumidas: number
          data_registro: string
        }
        Insert: {
          id_historico?: number
          id_classe_terapeutica: number
          mes_ano: string
          unidades_consumidas: number
          data_registro?: string
        }
        Update: {
          id_historico?: number
          id_classe_terapeutica?: number
          mes_ano?: string
          unidades_consumidas?: number
          data_registro?: string
        }
      }
    }
  }
}

// Tipos derivados para uso na aplicação
export type Usuario = Database['public']['Tables']['usuarios_internos']['Row']
export type Sku = Database['public']['Tables']['skus']['Row']
export type Lote = Database['public']['Tables']['lotes']['Row']
export type Movimentacao = Database['public']['Tables']['movimentacoes_estoque']['Row']
export type ClasseTerapeutica = Database['public']['Tables']['classes_terapeuticas']['Row']

// Tipos compostos para views complexas
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

// Tipos para formulários
export interface NovaMovimentacao {
  id_lote: number
  tipo_movimentacao: 'ENTRADA' | 'SAIDA'
  quantidade: number
  usuario: string
  observacao?: string
}

export interface NovoLote {
  id_sku: number
  quantidade_disponivel: number
  validade: string
}