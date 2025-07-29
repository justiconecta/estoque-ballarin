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

  // PACIENTES - CRUD Completo
  async getPacientes(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('data_cadastro', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
      throw error
    }
  },

  async getPacienteById(id: number) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id_paciente', id)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar paciente:', error)
      throw error
    }
  },

  async createPaciente(paciente: {
    nome: string
    cpf: string
    data_nascimento: string
    sexo: string
    telefone: string
    email: string
    origem_lead: string
  }) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .insert({
          ...paciente,
          data_cadastro: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao criar paciente:', error)
      throw error
    }
  },

  async updatePaciente(id: number, updates: Partial<{
    nome: string
    cpf: string
    data_nascimento: string
    sexo: string
    telefone: string
    email: string
    origem_lead: string
  }>) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .update(updates)
        .eq('id_paciente', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error)
      throw error
    }
  },

  async deletePaciente(id: number) {
    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id_paciente', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Erro ao deletar paciente:', error)
      throw error
    }
  },

  async searchPacientes(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .or(`nome.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`)
        .order('data_cadastro', { ascending: false })
        .limit(50)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
      throw error
    }
  },

  // CONSULTAS do paciente
  async getConsultasByPaciente(pacienteId: number) {
    try {
      const { data, error } = await supabase
        .from('consultas')
        .select('*')
        .eq('id_paciente', pacienteId)
        .order('data_agendamento', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar consultas do paciente:', error)
      throw error
    }
  },

  // Produtos (SKUs) - Query simplificada sem joins complexos
  async getProdutos() {
    try {
      // Primeiro buscar todos os SKUs
      const { data: skus, error: skusError } = await supabase
        .from('skus')
        .select('*')
        .eq('status_estoque', 'Ativo')
      
      if (skusError) throw skusError

      // Para cada SKU, buscar seus lotes
      const produtosComLotes = await Promise.all(
        skus.map(async (sku) => {
          const { data: lotes, error: lotesError } = await supabase
            .from('lotes')
            .select('*')
            .eq('id_sku', sku.id_sku)
            .gt('quantidade_disponivel', 0)
          
          if (lotesError) {
            console.error('Erro ao buscar lotes:', lotesError)
            return { ...sku, lotes: [] }
          }
          
          return { ...sku, lotes: lotes || [] }
        })
      )
      
      return produtosComLotes
    } catch (error) {
      console.error('Erro na query getProdutos:', error)
      throw error
    }
  },

  // Movimentações de estoque - Query simplificada
  async createMovimentacao(movimentacao: {
    id_lote: number
    tipo_movimentacao: 'ENTRADA' | 'SAIDA'
    quantidade: number
    usuario: string
    observacao?: string
  }) {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        id_lote: movimentacao.id_lote,
        tipo_movimentacao: movimentacao.tipo_movimentacao,
        quantidade: movimentacao.quantidade,
        usuario: movimentacao.usuario,
        observacao: movimentacao.observacao || null,
        data_movimentacao: new Date().toISOString()
      })
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

  // Criar novo lote
  async createLote(lote: {
    id_sku: number
    quantidade_disponivel: number
    validade: string
  }) {
    const { data, error } = await supabase
      .from('lotes')
      .insert({
        id_sku: lote.id_sku,
        quantidade_disponivel: lote.quantidade_disponivel,
        validade: lote.validade,
        data_entrada: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Buscar histórico de movimentações - Query simplificada
  async getMovimentacoes(limit = 50) {
    try {
      const { data: movimentacoes, error } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .order('data_movimentacao', { ascending: false })
        .limit(limit)
      
      if (error) throw error

      // Para cada movimentação, buscar info do lote e produto
      const movimentacoesDetalhadas = await Promise.all(
        (movimentacoes || []).map(async (mov) => {
          const { data: lote } = await supabase
            .from('lotes')
            .select('id_sku, validade')
            .eq('id_lote', mov.id_lote)
            .single()
          
          let nomeProduto = 'Produto não encontrado'
          if (lote) {
            const { data: sku } = await supabase
              .from('skus')
              .select('nome_produto')
              .eq('id_sku', lote.id_sku)
              .single()
            
            if (sku) {
              nomeProduto = sku.nome_produto
            }
          }
          
          return {
            ...mov,
            lotes: {
              id_sku: lote?.id_sku || 0,
              validade: lote?.validade || '',
              skus: {
                nome_produto: nomeProduto
              }
            }
          }
        })
      )
      
      return movimentacoesDetalhadas
    } catch (error) {
      console.error('Erro na query getMovimentacoes:', error)
      throw error
    }
  },

  // Classes terapêuticas
  async getClassesTerapeuticas() {
    const { data, error } = await supabase
      .from('classes_terapeuticas')
      .select('*')
    
    if (error) throw error
    return data || []
  }
}