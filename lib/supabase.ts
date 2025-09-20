import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Configuração Supabase
const SUPABASE_URL = 'https://jlprybnxjqzaqzsxxnuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscHJ5Ym54anF6YXF6c3h4bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzY1NDYsImV4cCI6MjA2OTMxMjU0Nn0.Zb5X_k-06u86aHmxwYg6ucy4hFvRKkm4_E1TBWyffjQ'

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const finalUrl = envUrl || SUPABASE_URL
const finalKey = envKey || SUPABASE_ANON_KEY

export const supabase = createClient<Database>(finalUrl, finalKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: { schema: 'public' }
})

// Context de clínica - ISOLAMENTO TOTAL
let currentClinicId: number | null = null
let currentClinicInfo: any = null

function setCurrentClinic(clinicId: number, clinicInfo?: any) {
  currentClinicId = clinicId
  currentClinicInfo = clinicInfo
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('clinic_id', clinicId.toString())
    localStorage.setItem('clinic_info', JSON.stringify(clinicInfo))
    console.log(`🏥 CLÍNICA ATIVA: ID=${clinicId}, Nome=${clinicInfo?.clinica_nome || 'Unknown'}`)
  }
}

function getCurrentClinicId(): number | null {
  if (currentClinicId === null && typeof window !== 'undefined') {
    const stored = localStorage.getItem('clinic_id')
    if (stored) {
      currentClinicId = parseInt(stored)
      console.log(`🔄 CLÍNICA RECUPERADA: ${currentClinicId}`)
    }
  }
  return currentClinicId
}

function clearCurrentClinic() {
  currentClinicId = null
  currentClinicInfo = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clinic_id')
    localStorage.removeItem('clinic_info')
    console.log('🚪 LOGOUT - CLÍNICA LIMPA')
  }
}

// Helper para garantir filtro por clínica em TODAS as queries
function ensureClinicFilter<T extends Record<string, any>>(data: T): T & { id_clinica: number } {
  const clinicId = getCurrentClinicId()
  if (!clinicId) {
    throw new Error('❌ SESSÃO EXPIRADA: Clínica não identificada')
  }
  return { ...data, id_clinica: clinicId }
}

export const supabaseApi = {
  supabase,
  getCurrentClinicId,

  // Autenticação com detecção de clínica
  async authenticateUser(username: string, password: string) {
    try {
      console.log(`🔍 LOGIN TENTATIVA: ${username}`)
      
      const { data, error } = await supabase
        .from('usuarios_internos')
        .select(`
          *,
          clinicas:id_clinica (
            id_clinica,
            nome_clinica,
            cnpj,
            ativa
          )
        `)
        .eq('usuario', username)
        .eq('senha', password)
        .single()
      
      if (error) {
        console.error('❌ LOGIN FALHOU:', error)
        throw error
      }
      
      console.log('✅ LOGIN SUCESSO:', {
        usuario: data.usuario,
        nome: data.nome_completo,
        clinica_id: data.id_clinica,
        clinica_nome: data.clinicas?.nome_clinica
      })
      
      // Definir clínica atual automaticamente (APENAS se não for admin geral)
      if (data.id_clinica && data.id_clinica > 0) {
        setCurrentClinic(data.id_clinica, {
          nome_completo: data.nome_completo,
          clinica_nome: data.clinicas?.nome_clinica
        })
      } else {
        // Admin geral não tem clínica específica
        console.log('🔍 ADMIN GERAL LOGADO - SEM CLÍNICA ESPECÍFICA')
      }
      
      return data
    } catch (error) {
      console.error('💥 ERRO DE LOGIN:', error)
      throw error
    }
  },

  // Logout
  async logout() {
    clearCurrentClinic()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ballarin_user')
    }
  },

  // ============ ADMIN GERAL - GESTÃO DE CLÍNICAS ============

  // VERIFICAR SE USUÁRIO É ADMIN GERAL
  async isAdminGeral(usuario: string): Promise<boolean> {
  try {
    console.log('🔍 isAdminGeral: Verificando usuário:', usuario)
    
    // ✅ CORREÇÃO DIRETA: Se usuário é "admin", é admin geral
    if (usuario === 'admin') {
      console.log('✅ isAdminGeral: Usuário "admin" detectado → ADMIN GERAL = TRUE')
      return true
    }
    
    // Para outros usuários, verificar no banco
    const { data, error } = await supabase
      .from('usuarios_internos')
      .select(`
        role, 
        id_clinica,
        clinicas:id_clinica (
          nome_clinica
        )
      `)
      .eq('usuario', usuario)
      .single()
    
    if (error) {
      console.error('❌ isAdminGeral: Erro SQL:', error)
      return false
    }
    
    console.log('📊 isAdminGeral: Dados do usuário:', {
      usuario,
      role: data.role,
      id_clinica: data.id_clinica,
      clinica: data.clinicas?.nome_clinica
    })
    
    const isRoleAdmin = data.role === 'admin'
    const nomeClinica = data.clinicas?.nome_clinica || ''
    const isClinicaAdminGeral = nomeClinica.toLowerCase().includes('admin geral')
    const isIdClinicaNull = data.id_clinica == null || data.id_clinica === 0
    
    const resultado = isRoleAdmin && (isIdClinicaNull || isClinicaAdminGeral)
    
    console.log(`🎯 isAdminGeral: RESULTADO = ${resultado ? 'SIM' : 'NÃO'}`)
    
    return resultado
  } catch (error) {
    console.error('💥 ERRO isAdminGeral:', error)
    return false
  }
},

  // LISTAR TODAS AS CLÍNICAS (apenas admin geral)
  async getTodasClinicas() {
    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .order('data_cadastro', { ascending: false })
      
      if (error) throw error
      console.log(`🏥 CLÍNICAS ENCONTRADAS: ${data?.length || 0}`)
      return data || []
    } catch (error) {
      console.error('💥 ERRO getTodasClinicas:', error)
      throw error
    }
  },

  // CRIAR NOVA CLÍNICA (apenas admin geral)
  async createClinica(clinica: {
    nome_clinica: string
    cnpj?: string
    endereco?: string
    telefone?: string
    email?: string
  }) {
    try {
      console.log('🏥 CRIANDO NOVA CLÍNICA:', clinica.nome_clinica)
      
      const clinicaCompleta = {
        ...clinica,
        plano: 'basico', // padrão fixo
        ativa: true,
        data_cadastro: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('clinicas')
        .insert(clinicaCompleta)
        .select()
        .single()
      
      if (error) throw error
      console.log('✅ CLÍNICA CRIADA:', data.id_clinica)
      return data
    } catch (error) {
      console.error('💥 ERRO createClinica:', error)
      throw error
    }
  },

  // CRIAR USUÁRIO ADMIN DA CLÍNICA (junto com clínica)
  async createAdminClinica(clinicaId: number, adminData: {
    nome_completo: string
    email: string
    usuario_base: string // será transformado em admin.{usuario_base}
  }) {
    try {
      const usuarioAdmin = `admin.${adminData.usuario_base}`
      const senhaInicial = `${adminData.usuario_base}123` // Senha temporária
      
      console.log(`👤 CRIANDO ADMIN PARA CLÍNICA ${clinicaId}:`, usuarioAdmin)
      
      const { data, error } = await supabase
        .from('usuarios_internos')
        .insert({
          usuario: usuarioAdmin,
          senha: senhaInicial,
          nome_completo: adminData.nome_completo,
          email: adminData.email,
          role: 'admin',
          id_clinica: clinicaId
        })
        .select()
        .single()
      
      if (error) throw error
      console.log('✅ ADMIN CLÍNICA CRIADO')
      return { ...data, senha_inicial: senhaInicial }
    } catch (error) {
      console.error('💥 ERRO createAdminClinica:', error)
      throw error
    }
  },

  // ATUALIZAR STATUS CLÍNICA (ativar/desativar)
  async updateStatusClinica(clinicaId: number, ativa: boolean) {
    try {
      console.log(`🔄 ATUALIZANDO STATUS CLÍNICA ${clinicaId}: ${ativa ? 'ATIVA' : 'INATIVA'}`)
      
      const { data, error } = await supabase
        .from('clinicas')
        .update({ ativa })
        .eq('id_clinica', clinicaId)
        .select()
        .single()
      
      if (error) throw error
      console.log('✅ STATUS CLÍNICA ATUALIZADO')
      return data
    } catch (error) {
      console.error('💥 ERRO updateStatusClinica:', error)
      throw error
    }
  },

  // ============ PACIENTES CRUD (ISOLAMENTO POR CLÍNICA) ============
  
  // LISTAR PACIENTES (isolamento por clínica)
  async getPacientes(limit = 100) {
  try {
    const clinicId = getCurrentClinicId()
    console.log(`👥 BUSCANDO PACIENTES PARA CLÍNICA: ${clinicId}`)
    
    if (!clinicId) throw new Error('Clínica não identificada')

    // ✅ QUERY COM CAMPOS CORRETOS DA TABELA REAL
    const { data, error } = await supabase
      .from('pacientes')
      .select(`
        id_paciente,
        nome_completo,
        cpf,
        data_nascimento,
        celular,
        email,
        genero,
        endereco_completo,
        origem_lead,
        status_paciente,
        termo_aceite_dados,
        data_ultima_atualizacao,
        consulta_agendada,
        id_clinica
      `)
      .eq('id_clinica', clinicId)
      .order('data_ultima_atualizacao', { ascending: false, nullsFirst: false })
      .limit(limit)
    
    if (error) {
      console.error('💥 ERRO DETALHADO getPacientes:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    console.log(`📊 PACIENTES ENCONTRADOS: ${data?.length || 0} para clínica ${clinicId}`)
    if (data && data.length > 0) {
      console.log('📋 PRIMEIRO PACIENTE (debug):', {
        id: data[0].id_paciente,
        nome: data[0].nome_completo,
        cpf: data[0].cpf,
        celular: data[0].celular,
        genero: data[0].genero,
        status: data[0].status_paciente
      })
    }
    
    return data || []
  } catch (error) {
    console.error('💥 ERRO GERAL getPacientes:', error)
    return []
  }
},

// CRIAR PACIENTE (corrigido com nome_completo)
async createPaciente(paciente: {
  nome_completo: string    // ✅ CORRIGIDO: era 'nome'
  cpf: string
  data_nascimento?: string
  genero?: string          // ✅ Mantido correto
  celular?: string         // ✅ Mantido correto  
  email?: string
  origem_lead?: string
  endereco_completo?: string
  status_paciente?: string
  termo_aceite_dados?: boolean
}) {
  try {
    const pacienteCompleto = ensureClinicFilter({
      ...paciente,
      data_ultima_atualizacao: new Date().toISOString(),
      consulta_agendada: false
    })

    console.log('👤 CRIANDO PACIENTE:', { 
      nome_completo: pacienteCompleto.nome_completo, 
      clinica: pacienteCompleto.id_clinica 
    })
    
    const { data, error } = await supabase
      .from('pacientes')
      .insert(pacienteCompleto)
      .select()
      .single()
    
    if (error) throw error
    console.log('✅ PACIENTE CRIADO')
    return data
  } catch (error) {
    console.error('💥 ERRO createPaciente:', error)
    throw error
  }
},

// ATUALIZAR PACIENTE (corrigido com nome_completo)
async updatePaciente(id: number, updates: {
  nome_completo?: string   // ✅ CORRIGIDO: era 'nome'
  cpf?: string
  data_nascimento?: string
  genero?: string          // ✅ Mantido correto
  celular?: string         // ✅ Mantido correto
  email?: string
  origem_lead?: string
  endereco_completo?: string
  status_paciente?: string
}) {
  try {
    const clinicId = getCurrentClinicId()
    if (!clinicId) throw new Error('Clínica não identificada')

    // Adicionar timestamp de atualização
    const updatesWithTimestamp = {
      ...updates,
      data_ultima_atualizacao: new Date().toISOString()
    }

    console.log(`📝 ATUALIZANDO PACIENTE ${id} PARA CLÍNICA: ${clinicId}`)
    
    const { data, error } = await supabase
      .from('pacientes')
      .update(updatesWithTimestamp)
      .eq('id_paciente', id)
      .eq('id_clinica', clinicId) // VALIDAÇÃO DUPLA
      .select()
      .single()
    
    if (error) throw error
    console.log('✅ PACIENTE ATUALIZADO')
    return data
  } catch (error) {
    console.error('💥 ERRO updatePaciente:', error)
    throw error
  }
},

// BUSCAR PACIENTES PARA DASHBOARD IA (corrigido)
async searchPacientes(searchTerm: string) {
  try {
    const clinicId = getCurrentClinicId()
    if (!clinicId) return []

    console.log(`🔍 BUSCANDO PACIENTES IA: "${searchTerm}"`)

    // Limpar e formatar termo de busca
    const cleanTerm = searchTerm.replace(/[^\d]/g, '') // Remove formatação CPF
    
    const { data, error } = await supabase
      .from('pacientes')
      .select('id_paciente, nome_completo, cpf, data_nascimento, celular')  // ✅ CORRIGIDO
      .eq('id_clinica', clinicId)
      .or(`nome_completo.ilike.%${searchTerm}%,cpf.eq.${cleanTerm}`)        // ✅ CORRIGIDO
      .limit(10)
    
    if (error) throw error
    
    console.log(`📋 PACIENTES ENCONTRADOS: ${data?.length || 0}`)
    return data || []
  } catch (error) {
    console.error('💥 ERRO searchPacientes:', error)
    return []
  }
},

  // ============ PRODUTOS/ESTOQUE (MANTIDO DO CÓDIGO ANTERIOR) ============
  
  // Produtos com FILTRO RIGOROSO
  async getProdutos() {
    try {
      const clinicId = getCurrentClinicId()
      console.log(`📦 BUSCANDO PRODUTOS PARA CLÍNICA: ${clinicId}`)
      
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data: skus, error: skusError } = await supabase
        .from('skus')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('status_estoque', 'Ativo')
      
      if (skusError) throw skusError

      const produtosComLotes = await Promise.all(
        (skus || []).map(async (sku) => {
          const { data: lotes, error: lotesError } = await supabase
            .from('lotes')
            .select('*')
            .eq('id_sku', sku.id_sku)
            .eq('id_clinica', clinicId)
            .gt('quantidade_disponivel', 0)
          
          if (lotesError) {
            console.error('❌ ERRO LOTES:', lotesError)
            return { ...sku, lotes: [] }
          }
          
          return { ...sku, lotes: lotes || [] }
        })
      )
      
      console.log(`📊 PRODUTOS ENCONTRADOS: ${produtosComLotes.length}`)
      return produtosComLotes
    } catch (error) {
      console.error('💥 ERRO getProdutos:', error)
      return []
    }
  },

  // Criar movimentação com VALIDAÇÃO RIGOROSA
  async createMovimentacao(movimentacao: {
    id_lote: number
    tipo_movimentacao: 'ENTRADA' | 'SAIDA'
    quantidade: number
    usuario: string
    observacao?: string
  }) {
    try {
      const movimentacaoCompleta = ensureClinicFilter({
        ...movimentacao,
        data_movimentacao: new Date().toISOString()
      })

      console.log('💊 CRIANDO MOVIMENTAÇÃO:', movimentacaoCompleta)
      
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .insert(movimentacaoCompleta)
        .select()
        .single()
      
      if (error) throw error
      console.log('✅ MOVIMENTAÇÃO CRIADA')
      return data
    } catch (error) {
      console.error('💥 ERRO createMovimentacao:', error)
      throw error
    }
  },

  // Criar lote com VALIDAÇÃO RIGOROSA
  async createLote(lote: {
    id_sku: number
    quantidade_disponivel: number
    validade: string
  }) {
    try {
      const loteCompleto = ensureClinicFilter({
        ...lote,
        data_entrada: new Date().toISOString()
      })

      console.log('🏭 CRIANDO LOTE:', loteCompleto)
      
      const { data, error } = await supabase
        .from('lotes')
        .insert(loteCompleto)
        .select()
        .single()
      
      if (error) throw error
      console.log('✅ LOTE CRIADO')
      return data
    } catch (error) {
      console.error('💥 ERRO createLote:', error)
      throw error
    }
  },

  // Atualizar lote com VALIDAÇÃO DE CLÍNICA
  async updateLoteQuantidade(id_lote: number, novaQuantidade: number) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('lotes')
        .update({ quantidade_disponivel: novaQuantidade })
        .eq('id_lote', id_lote)
        .eq('id_clinica', clinicId) // VALIDAÇÃO DUPLA
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('💥 ERRO updateLoteQuantidade:', error)
      throw error
    }
  },

  // Histórico com FILTRO RIGOROSO
  async getMovimentacoes(limit = 50) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return []

      const { data: movimentacoes, error } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .eq('id_clinica', clinicId)
        .order('data_movimentacao', { ascending: false })
        .limit(limit)
      
      if (error) throw error

      const movimentacoesDetalhadas = await Promise.all(
        (movimentacoes || []).map(async (mov) => {
          const { data: lote } = await supabase
            .from('lotes')
            .select('id_sku, validade')
            .eq('id_lote', mov.id_lote)
            .eq('id_clinica', clinicId) // FILTRO DUPLO
            .single()
          
          let nomeProduto = 'Produto não encontrado'
          if (lote) {
            const { data: sku } = await supabase
              .from('skus')
              .select('nome_produto')
              .eq('id_sku', lote.id_sku)
              .eq('id_clinica', clinicId) // FILTRO DUPLO
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
      console.error('💥 ERRO getMovimentacoes:', error)
      return []
    }
  },
async getResumosDiariosPaciente(cpf: string) {
  try {
    const clinicId = getCurrentClinicId()
    if (!clinicId) {
      console.log('❌ ID da clínica não encontrado')
      return []
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    console.log(`📅 BUSCANDO RESUMOS DIÁRIOS: CPF=${cpfLimpo}, Clínica=${clinicId}`)

    const { data, error } = await supabase
      .from('resumos_diarios_paciente')
      .select(`
        id_resumo_diario,
        cpf,
        nome_paciente,
        resumo_interacoes,
        status_processamento,
        data_resumo,
        data_criacao,
        id_clinica
      `)
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .order('data_resumo', { ascending: false })

    if (error) {
      console.error('❌ ERRO ao buscar resumos diários:', error.message)
      return []
    }

    const resumos = data || []
    console.log(`📊 RESUMOS DIÁRIOS ENCONTRADOS: ${resumos.length}`)
    
    // Log detalhado das datas encontradas
    if (resumos.length > 0) {
      console.log('📋 Resumos encontrados:', resumos.map(r => ({
        id: r.id_resumo_diario,           // ✅ CORRETO
        data_resumo: r.data_resumo,
        data_criacao: r.data_criacao,
        tem_conversa: r.resumo_interacoes ? 'SIM' : 'NÃO', // ✅ CORRETO
        tamanho: r.resumo_interacoes?.length || 0
      })).slice(0, 5))
    }
    
    return resumos
  } catch (error) {
    console.error('💥 ERRO CRÍTICO getResumosDiariosPaciente:', error)
    return []
  }
},

// ✅ BUSCAR RESUMOS SEMANAIS - COLUNAS CORRETAS
async getResumosSemanasPaciente(cpf: string) {
  try {
    const clinicId = getCurrentClinicId()
    if (!clinicId) {
      console.log('❌ ID da clínica não encontrado')
      return []
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    console.log(`📈 BUSCANDO RESUMOS SEMANAIS: CPF=${cpfLimpo}, Clínica=${clinicId}`)

    const { data, error } = await supabase
      .from('resumos_semanais_paciente')
      .select(`
        id_resumo_sem,
        cpf,
        nome_paciente,
        data_inicio_semana,
        data_fim_semana,
        resumo_geral_semana,
        data_geracao,
        id_clinica
      `)
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .order('data_inicio_semana', { ascending: false })

    if (error) {
      console.error('❌ ERRO ao buscar resumos semanais:', error.message)
      return []
    }

    const resumos = data || []
    console.log(`📈 RESUMOS SEMANAIS ENCONTRADOS: ${resumos.length}`)
    
    return resumos
  } catch (error) {
    console.error('💥 ERRO CRÍTICO getResumosSemanasPaciente:', error)
    return []
  }
},

// ✅ BUSCAR RESUMO ESPECÍFICO - COLUNAS CORRETAS + BUSCA EXATA
async getResumoEspecifico(cpf: string, dataResumo: string) {
  try {
    const clinicId = getCurrentClinicId()
    if (!clinicId) {
      console.log('❌ ID da clínica não encontrado')
      return null
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    console.log(`💬 BUSCA EXATA: CPF=${cpfLimpo}, Data=${dataResumo}, Clínica=${clinicId}`)

    // ✅ BUSCA EXATA por data_resumo
    const { data: resumoExato, error: errorExato } = await supabase
      .from('resumos_diarios_paciente')
      .select(`
        id_resumo_diario,
        cpf,
        nome_paciente,
        resumo_interacoes,
        status_processamento,
        data_resumo,
        data_criacao,
        id_clinica
      `)
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .eq('data_resumo', dataResumo)
      .single()

    if (!errorExato && resumoExato) {
      console.log('✅ CONVERSA ENCONTRADA (busca exata):', {
        id: resumoExato.id_resumo_diario,             // ✅ CORRETO
        data: resumoExato.data_resumo,
        tem_conversa: resumoExato.resumo_interacoes ? 'SIM' : 'NÃO', // ✅ CORRETO
        tamanho: resumoExato.resumo_interacoes?.length || 0,
        preview: resumoExato.resumo_interacoes?.substring(0, 100) + '...'
      })
      return resumoExato
    }

    console.log('⚠️ Busca exata falhou, tentando busca por range...')
    
    // ✅ FALLBACK: Busca por range do dia
    const dataInicio = dataResumo + 'T00:00:00.000Z'
    const dataFim = dataResumo + 'T23:59:59.999Z'
    
    const { data: resumoRange, error: errorRange } = await supabase
      .from('resumos_diarios_paciente')
      .select(`
        id_resumo_diario,
        cpf,
        nome_paciente,
        resumo_interacoes,
        status_processamento,
        data_resumo,
        data_criacao,
        id_clinica
      `)
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .gte('data_resumo', dataInicio)
      .lte('data_resumo', dataFim)
      .order('data_resumo', { ascending: false })
      .limit(1)
      .single()

    if (!errorRange && resumoRange) {
      console.log('✅ CONVERSA ENCONTRADA (busca range):', {
        id: resumoRange.id_resumo_diario,
        data: resumoRange.data_resumo,
        tem_conversa: resumoRange.resumo_interacoes ? 'SIM' : 'NÃO'
      })
      return resumoRange
    }

    // ✅ ÚLTIMO RECURSO: Buscar por data_criacao
    console.log('⚠️ Tentando busca por data_criacao...')
    
    const { data: resumoFallback, error: errorFallback } = await supabase
      .from('resumos_diarios_paciente')
      .select(`
        id_resumo_diario,
        cpf,
        nome_paciente,
        resumo_interacoes,
        status_processamento,
        data_resumo,
        data_criacao,
        id_clinica
      `)
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .gte('data_criacao', dataInicio)
      .lte('data_criacao', dataFim)
      .order('data_criacao', { ascending: false })
      .limit(1)
      .single()

    if (!errorFallback && resumoFallback) {
      console.log('✅ CONVERSA ENCONTRADA (fallback data_criacao):', {
        id: resumoFallback.id_resumo_diario,
        data_resumo: resumoFallback.data_resumo,
        data_criacao: resumoFallback.data_criacao
      })
      return resumoFallback
    }

    // ✅ DEBUG: Listar todas as datas disponíveis
    const { data: todasAsDatas } = await supabase
      .from('resumos_diarios_paciente')
      .select('data_resumo, data_criacao, id_resumo_diario, resumo_interacoes')
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .order('data_resumo', { ascending: false })
      .limit(10)

    console.log('📅 DATAS DISPONÍVEIS PARA DEBUG:', todasAsDatas?.map(d => ({
      id: d.id_resumo_diario,
      data_resumo: d.data_resumo,
      data_criacao: d.data_criacao,
      tem_conteudo: d.resumo_interacoes ? 'SIM' : 'NÃO',
      tamanho: d.resumo_interacoes?.length || 0
    })) || [])
    
    console.log(`❌ DATA SOLICITADA "${dataResumo}" NÃO ENCONTRADA`)
    
    return null
    
  } catch (error) {
    console.error('💥 ERRO CRÍTICO getResumoEspecifico:', error)
    return null
  }
},

// ✅ FUNÇÃO DE DEBUG - COLUNAS CORRETAS
async debugResumosPaciente(cpf: string) {
  try {
    const clinicId = getCurrentClinicId()
    const cpfLimpo = cpf.replace(/\D/g, '')
    
    console.log('🔍 DEBUG RESUMOS PACIENTE:', { cpf: cpfLimpo, clinica: clinicId })

    // Verificar dados sem filtro de clínica
    const { data: semFiltro } = await supabase
      .from('resumos_diarios_paciente')
      .select(`
        id_resumo_diario,
        cpf,
        data_resumo,
        data_criacao,
        id_clinica,
        resumo_interacoes
      `)
      .eq('cpf', cpfLimpo)
      .limit(5)

    console.log('📋 Dados sem filtro de clínica:', {
      count: semFiltro?.length || 0,
      samples: semFiltro?.map(r => ({ 
        id: r.id_resumo_diario,              // ✅ CORRETO
        data_resumo: r.data_resumo,
        data_criacao: r.data_criacao, 
        clinica: r.id_clinica,
        tem_conversa: r.resumo_interacoes ? 'SIM' : 'NÃO', // ✅ CORRETO
        tamanho: r.resumo_interacoes?.length || 0
      })) || []
    })

    // Verificar dados com filtro de clínica
    const { data: comFiltro } = await supabase
      .from('resumos_diarios_paciente')
      .select(`
        id_resumo_diario,
        cpf,
        data_resumo,
        data_criacao,
        resumo_interacoes
      `)
      .eq('cpf', cpfLimpo)
      .eq('id_clinica', clinicId)
      .limit(5)

    console.log('📋 Dados com filtro de clínica:', {
      count: comFiltro?.length || 0,
      samples: comFiltro?.map(r => ({ 
        id: r.id_resumo_diario,
        data_resumo: r.data_resumo,
        data_criacao: r.data_criacao,
        tem_conversa: r.resumo_interacoes ? 'SIM' : 'NÃO',
        tamanho: r.resumo_interacoes?.length || 0
      })) || []
    })

    return { semFiltro, comFiltro }
    
  } catch (error) {
    console.error('💥 ERRO DEBUG:', error)
    return null
  }
},
  // ============ FUNÇÕES PARA PROCEDIMENTOS E OUTROS DADOS ============
  
  // PROCEDIMENTOS (isolamento por clínica)
  async getProcedimentos(limit = 100) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return []

      const { data, error } = await supabase
        .from('procedimentos')
        .select('*')
        .eq('id_clinica', clinicId)
        .order('data_realizacao', { ascending: false, nullsFirst: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('💥 ERRO getProcedimentos:', error)
      return []
    }
  },

  // GOOGLE REVIEWS (isolamento por clínica)
  async getGoogleReviews(limit = 50) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return []

      const { data, error } = await supabase
        .from('google_review')
        .select('*')
        .eq('id_clinica', clinicId)
        .order('data_review', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('💥 ERRO getGoogleReviews:', error)
      return []
    }
    
  }
}