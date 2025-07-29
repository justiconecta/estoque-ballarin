import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { checkEnvironmentVariables, config } from '@/lib/env-check'

// Verificar env vars na inicialização
checkEnvironmentVariables()

export const supabase = createClient<Database>(config.supabase.url, config.supabase.anonKey, {
  auth: {
    persistSession: false, // Sistema interno não precisa de sessão persistente
    autoRefreshToken: false,
  },
  db: {
    schema: 'public'
  }
})

// Helper functions for common operations
export const supabaseApi = {
  // Autenticação
  async authenticateUser(username: string, password: string) {
    const { data, error } = await supabase
      .from('usuarios_internos')
      .select('*')
      .eq('usuario', username)
      .eq('senha', password)
      .single()
    
    if (error) throw error
    return data
  },

  // Produtos (SKUs)
  async getProdutos() {
    const { data, error } = await supabase
      .from('skus')
      .select(`
        *,
        lotes!inner(*)
      `)
      .eq('status_estoque', 'Ativo')
    
    if (error) throw error
    return data
  },

  // Movimentações de estoque
  async createMovimentacao(movimentacao: {
    id_lote: number
    tipo_movimentacao: 'ENTRADA' | 'SAIDA'
    quantidade: number
    usuario: string
    observacao?: string
  }) {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .insert(movimentacao)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Atualizar quantidade do lote
  async updateLoteQuantidade(id_lote: number, novaQuantidade: number) {
    const { data, error } = await supabase
      .from('lotes')
      .update({ quantidade_disponivel: novaQuantidade })
      .eq('id_lote', id_lote)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Buscar histórico de movimentações
  async getMovimentacoes(limit = 50) {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select(`
        *,
        lotes!inner(
          id_sku,
          validade,
          skus!inner(nome_produto)
        )
      `)
      .order('data_movimentacao', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  // Classes terapêuticas
  async getClassesTerapeuticas() {
    const { data, error } = await supabase
      .from('classes_terapeuticas')
      .select('*')
    
    if (error) throw error
    return data
  }
}