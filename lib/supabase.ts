import { createClient } from '@supabase/supabase-js'
import { Database, TipoDespesa } from '@/types/database'

// Configuração Supabase
const SUPABASE_URL = 'https://jlprybnxjqzaqzsxxnuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscHJ5Ym54anF6YXF6c3h4bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzY1NDYsImV4cCI6MjA2OTMxMjU0Nn0.Zb5X_k-06u86aHmxwYg6ucy4hFvRKkm4_E1TBWyffjQ'

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const finalUrl = envUrl || SUPABASE_URL
const finalKey = envKey || SUPABASE_ANON_KEY

export const supabase = createClient<Database>(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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

// Função assíncrona para buscar clinic_id do usuário logado via Supabase Auth
async function getClinicIdFromAuth(): Promise<number | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const { data } = await supabase
      .from('usuarios_internos')
      .select('id_clinica')
      .eq('auth_id', session.user.id)
      .single()

    if (data?.id_clinica) {
      // Salvar no localStorage para próximas chamadas síncronas
      if (typeof window !== 'undefined') {
        localStorage.setItem('clinic_id', data.id_clinica.toString())
      }
      currentClinicId = data.id_clinica
      console.log(`🔐 CLÍNICA VIA AUTH: ${data.id_clinica}`)
      return data.id_clinica
    }
    return null
  } catch (error) {
    console.error('Erro ao buscar clínica do auth:', error)
    return null
  }
}

function getCurrentClinicId(): number | null {
  // Primeiro tenta do cache em memória
  if (currentClinicId !== null) {
    return currentClinicId
  }
  
  // Depois tenta do localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('clinic_id')
    if (stored) {
      currentClinicId = parseInt(stored)
      console.log(`🔄 CLÍNICA RECUPERADA DO LOCALSTORAGE: ${currentClinicId}`)
      return currentClinicId
    }
    
    // Tenta pegar do ballarin_user (compatibilidade)
    const userStr = localStorage.getItem('ballarin_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.id_clinica) {
          currentClinicId = user.id_clinica
          localStorage.setItem('clinic_id', user.id_clinica.toString())
          console.log(`🔄 CLÍNICA RECUPERADA DO USER: ${currentClinicId}`)
          return currentClinicId
        }
      } catch (e) {
        console.error('Erro ao parsear ballarin_user:', e)
      }
    }
  }
  
  return null
}

// Função assíncrona para garantir que temos o clinic_id (chamada no início das páginas)
async function ensureClinicId(): Promise<number | null> {
  // Primeiro tenta síncrono
  const syncId = getCurrentClinicId()
  if (syncId) return syncId
  
  // Se não tem, busca do Supabase Auth
  const authId = await getClinicIdFromAuth()
  if (authId) {
    currentClinicId = authId
    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_id', authId.toString())
    }
    return authId
  }
  
  return null
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

// ✅ FIX BUG 9: Helper para converter "MM/YYYY" para DATE ISO (primeiro dia do mês)
function convertPeriodoToDate(periodo: string | null | undefined): string | null {
  if (!periodo) return null
  
  // Se já está no formato ISO (YYYY-MM-DD), retornar como está
  if (periodo.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return periodo
  }
  
  // Converter de "MM/YYYY" para "YYYY-MM-01"
  const match = periodo.match(/^(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, mes, ano] = match
    return `${ano}-${mes.padStart(2, '0')}-01`
  }
  
  console.warn('⚠️ Formato de período inválido:', periodo)
  return null
}

export const supabaseApi = {
  supabase,
  getCurrentClinicId,
  getClinicIdFromAuth,
  ensureClinicId,

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

  // ============ MÓDULO FINANCEIRO - SERVIÇOS ============

  async getServicos() {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) throw error

      // ✅ FIX: Validar e normalizar dados dos serviços
      const servicosValidados = (data || []).map(servico => ({
        ...servico,
        preco: Number(servico.preco) || 0,
        custo_insumos: Number(servico.custo_insumos) || 0,
        custo_equip: Number(servico.custo_equip) || 0,
        categoria: servico.categoria?.trim() || 'Outros'
      }))

      console.log(`📋 SERVIÇOS ENCONTRADOS: ${servicosValidados.length}`)
      return servicosValidados
    } catch (error) {
      console.error('💥 ERRO getServicos:', error)
      return []
    }
  },

  async createServico(servico: { nome: string; preco: number; custo_insumos: number }) {
    try {
      const servicoCompleto = ensureClinicFilter({
        ...servico,
        custo_equip: 0,
        ativo: true
      })

      const { data, error } = await supabase
        .from('servicos')
        .insert(servicoCompleto)
        .select()
        .single()

      if (error) throw error
      console.log('✅ SERVIÇO CRIADO:', data.nome)
      return data
    } catch (error) {
      console.error('💥 ERRO createServico:', error)
      throw error
    }
  },

  async updateServico(id: number, updates: Partial<{ nome: string; preco: number; custo_insumos: number }>) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('servicos')
        .update(updates)
        .eq('id', id)
        .eq('id_clinica', clinicId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('💥 ERRO updateServico:', error)
      throw error
    }
  },

  // ============ MÓDULO FINANCEIRO - DESPESAS ============

  async getDespesas() {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('ativo', true)
        .order('categoria', { ascending: true })

      if (error) throw error
      console.log(`💰 DESPESAS ENCONTRADAS: ${data?.length || 0}`)
      return data || []
    } catch (error) {
      console.error('💥 ERRO getDespesas:', error)
      return []
    }
  },

  // ✅ FIX BUG 9: Converter periodo de "MM/YYYY" para DATE ISO
  async createDespesa(despesa: {
    tipo?: TipoDespesa
    categoria: string
    item: string
    valor_mensal: number
    periodo?: string  // Aceita "MM/YYYY" e converte para DATE
  }) {
    try {
      // ✅ CORREÇÃO: Converter periodo para formato DATE
      const periodoDate = convertPeriodoToDate(despesa.periodo)
      
      const despesaCompleta = ensureClinicFilter({
        tipo: despesa.tipo || 'Despesa Fixa',
        categoria: despesa.categoria,
        item: despesa.item,
        valor_mensal: despesa.valor_mensal,
        periodo: periodoDate,  // ✅ Agora é DATE válido
        ativo: true
      })

      console.log('📝 CRIANDO DESPESA:', despesaCompleta)

      const { data, error } = await supabase
        .from('despesas')
        .insert(despesaCompleta)
        .select()
        .single()

      if (error) {
        console.error('❌ ERRO SQL createDespesa:', error)
        throw error
      }
      
      console.log('✅ DESPESA CRIADA:', data.item, '- Período:', data.periodo)
      return data
    } catch (error) {
      console.error('💥 ERRO createDespesa:', error)
      throw error
    }
  },

  // ============ MÓDULO FINANCEIRO - PROFISSIONAIS ============

  async getProfissionais() {
    try {
      const clinicId = getCurrentClinicId()
      
      console.log('👥 getProfissionais - clinicId:', clinicId)
      
      if (!clinicId) {
        console.error('❌ getProfissionais: clinicId é NULL!')
        console.log('📦 localStorage clinic_id:', localStorage.getItem('clinic_id'))
        console.log('📦 localStorage ballarin_user:', localStorage.getItem('ballarin_user'))
        throw new Error('Clínica não identificada')
      }

      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) {
        console.error('❌ getProfissionais ERRO SQL:', error)
        throw error
      }
      
      console.log(`✅ PROFISSIONAIS ENCONTRADOS: ${data?.length || 0} para clínica ${clinicId}`)
      console.log('📋 Dados:', data)
      
      return data || []
    } catch (error) {
      console.error('💥 ERRO getProfissionais:', error)
      return []
    }
  },

  async createProfissional(profissional: { nome: string; horas_semanais: number }) {
    try {
      const profissionalCompleto = ensureClinicFilter({
        ...profissional,
        ativo: true
      })

      const { data, error } = await supabase
        .from('profissionais')
        .insert(profissionalCompleto)
        .select()
        .single()

      if (error) throw error
      console.log('✅ PROFISSIONAL CRIADO:', data.nome)
      return data
    } catch (error) {
      console.error('💥 ERRO createProfissional:', error)
      throw error
    }
  },

  // ✅ ATUALIZADO: Incluir duracao_servico
  async updateProfissional(id: number, updates: Partial<{
    nome: string
    horas_semanais: number
    percentual_profissional: number
    perfil: 'proprietario' | 'comissionado'
    duracao_servico: number  // ✅ NOVO CAMPO
  }>) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('profissionais')
        .update(updates)
        .eq('id', id)
        .eq('id_clinica', clinicId)
        .select()
        .single()

      if (error) throw error
      console.log('✅ PROFISSIONAL ATUALIZADO:', data.nome)
      return data
    } catch (error) {
      console.error('💥 ERRO updateProfissional:', error)
      throw error
    }
  },

  async deleteProfissional(id: number) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { error } = await supabase
        .from('profissionais')
        .update({ ativo: false })
        .eq('id', id)
        .eq('id_clinica', clinicId)

      if (error) throw error
      console.log('✅ PROFISSIONAL REMOVIDO')
    } catch (error) {
      console.error('💥 ERRO deleteProfissional:', error)
      throw error
    }
  },

  // ============ MÓDULO FINANCEIRO - PARÂMETROS ============

  async getParametros() {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('parametros')
        .select('*')
        .eq('id_clinica', clinicId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Não existe, criar com valores padrão
        return this.createParametros()
      }

      if (error) throw error
      return data
    } catch (error) {
      console.error('💥 ERRO getParametros:', error)
      throw error
    }
  },

  async createParametros() {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const parametrosPadrao = {
        id_clinica: clinicId,
        numero_salas: 3,
        horas_trabalho_dia: 8,
        duracao_media_servico_horas: 1.0,
        mod_padrao: 500.00,
        aliquota_impostos_pct: 17.0,
        taxa_cartao_pct: 4.0,
        meta_resultado_liquido_mensal: 65000.00,
        modern_inova: 10.0,           
        fator_correcao_marca: 1.5,    
        custo_hora: null              
      }

      const { data, error } = await supabase
        .from('parametros')
        .insert(parametrosPadrao)
        .select()
        .single()

      if (error) throw error
      console.log('✅ PARÂMETROS CRIADOS')
      return data
    } catch (error) {
      console.error('💥 ERRO createParametros:', error)
      throw error
    }
  },

  // ✅ MODIFICADO: Agora atualiza SKU "Locação de Sala" automaticamente
  async updateParametros(updates: Partial<{
    numero_salas: number
    horas_trabalho_dia: number
    duracao_media_servico_horas: number
    mod_padrao: number
    aliquota_impostos_pct: number
    taxa_cartao_pct: number
    meta_resultado_liquido_mensal: number
    modern_inova: number
    fator_correcao_marca: number
    custo_hora: number
  }>) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('parametros')
        .update(updates)
        .eq('id_clinica', clinicId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Nenhum registro de parâmetros encontrado. Criando...')
          return this.createParametros()
        }
        throw error
      }
      
      console.log('✅ PARÂMETROS ATUALIZADOS (UPDATE):', Object.keys(updates))

      // ✅ NOVO: Se atualizou custo_hora ou fator_correcao_marca, recalcular SKU Locação de Sala
      if (updates.custo_hora !== undefined || updates.fator_correcao_marca !== undefined) {
        console.log('🔄 Recalculando valor_venda do SKU Locação de Sala...')
        await this.updateSkuLocacaoSala()
      }

      return data
    } catch (error) {
      console.error('💥 ERRO updateParametros:', error)
      throw error
    }
  },

  // ============ MÓDULO FINANCEIRO - VENDAS ============

  // ✅ OTIMIZADO: De 4 queries para 2 queries paralelas
  // ANTES: vendas → profissionais → skus (sequencial)
  // DEPOIS: vendas + (profissionais || skus) em paralelo
  async getVendas(ano: number, meses: number[]) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const dataInicio = `${ano}-${String(Math.min(...meses)).padStart(2, '0')}-01`
      const ultimoMes = Math.max(...meses)
      const ultimoDia = new Date(ano, ultimoMes, 0).getDate()
      const dataFim = `${ano}-${String(ultimoMes).padStart(2, '0')}-${ultimoDia}`

      // ✅ Query 1: Vendas com pacientes (JOIN nativo do Supabase)
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          pacientes:id_paciente (
            nome_completo,
            cpf
          )
        `)
        .eq('id_clinica', clinicId)
        .gte('data_venda', dataInicio)
        .lte('data_venda', dataFim)
        .order('data_venda', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        console.log('💵 VENDAS ENCONTRADAS: 0')
        return []
      }

      // ✅ Extrair IDs únicos para busca em batch
      const profissionaisIds = Array.from(new Set(data.map(v => v.id_profissional).filter(Boolean))) as number[]
      const allSkuIds = new Set<number>()
      data.forEach(venda => {
        if (venda.items && Array.isArray(venda.items)) {
          venda.items.forEach((item: any) => {
            if (item.id) allSkuIds.add(item.id)
          })
        }
      })

      // ✅ Query 2: Profissionais e SKUs em PARALELO (não sequencial)
      const [profissionaisResult, skusResult] = await Promise.all([
        profissionaisIds.length > 0
          ? supabase
              .from('profissionais')
              .select('id, nome, perfil, percentual_profissional')
              .in('id', profissionaisIds)
          : Promise.resolve({ data: [] }),
        allSkuIds.size > 0
          ? supabase
              .from('skus')
              .select('id_sku, nome_produto, valor_venda, classe_terapeutica')
              .in('id_sku', Array.from(allSkuIds))
          : Promise.resolve({ data: [] })
      ])

      // Criar mapas para lookup O(1)
      const profissionaisMap = new Map<number, any>()
      ;(profissionaisResult.data || []).forEach(p => profissionaisMap.set(p.id, p))

      const skuMap = new Map<number, any>()
      ;(skusResult.data || []).forEach(sku => skuMap.set(sku.id_sku, sku))

      // Enriquecer vendas com dados dos SKUs e Profissionais
      const vendasCompletas = data.map(venda => {
        const itemsEnriquecidos = (venda.items || []).map((item: any) => ({
          id_sku: item.id,
          quantidade: item.qtd,
          sku: skuMap.get(item.id) || null
        }))

        return {
          ...venda,
          itemsEnriquecidos, // ✅ Array com {id_sku, quantidade, sku: {nome_produto, ...}}
          profissional: profissionaisMap.get(venda.id_profissional) || null // ✅ Dados do profissional
        }
      })

      console.log(`💵 VENDAS ENCONTRADAS: ${vendasCompletas.length} (com SKUs)`)
      return vendasCompletas
    } catch (error) {
      console.error('💥 ERRO getVendas:', error)
      return []
    }
  },

  async getSKUs() {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .eq('id_clinica', clinicId)
        .order('nome_produto', { ascending: true })

      if (error) throw error
      console.log(`📦 SKUs ENCONTRADOS: ${data?.length || 0}`)
      return data || []
    } catch (error) {
      console.error('💥 ERRO getSKUs:', error)
      return []
    }
  },

  async updateSKU(id_sku: number, updates: {
    classe_terapeutica?: string
    fator_divisao?: string
    valor_venda?: number  // ✅ ADICIONADO para permitir atualização do valor_venda
  }) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('skus')
        .update(updates)
        .eq('id_sku', id_sku)
        .eq('id_clinica', clinicId)
        .select()
        .single()

      if (error) throw error
      console.log('✅ SKU ATUALIZADO:', data.nome_produto)
      return data
    } catch (error) {
      console.error('💥 ERRO updateSKU:', error)
      throw error
    }
  },

  // ✅ MODIFICADO: createVenda agora cria despesa de comissão automaticamente
  // ✅ OTIMIZADO: Batch query para lotes (1 query ao invés de N)
  async createVenda(venda: {
    id_paciente: number
    data_venda: string
    metodo_pagamento: 'PIX' | 'Débito' | 'Crédito'
    parcelas: number
    desconto_valor: number
    valor_entrada: number
    id_profissional?: number | null
    items?: number[]
    insumos: { id_lote: number; quantidade: number }[]
  }) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      if (!venda.insumos || venda.insumos.length === 0) {
        throw new Error('Nenhum insumo selecionado para a venda')
      }

      // ✅ OTIMIZADO: Buscar TODOS os lotes em 1 query (ao invés de N queries)
      const loteIds = venda.insumos.map(item => item.id_lote)
      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select('*, skus:id_sku(id_sku, nome_produto, valor_venda, classe_terapeutica)')
        .in('id_lote', loteIds)

      if (lotesError) throw lotesError

      // Criar mapa para lookup O(1)
      const lotesMap = new Map<number, any>()
      ;(lotesData || []).forEach(lote => lotesMap.set(lote.id_lote, lote))

      // Validar que todos os lotes foram encontrados e calcular valores
      const insumosDetalhados = venda.insumos.map(item => {
        const lote = lotesMap.get(item.id_lote)
        if (!lote) throw new Error(`Lote ${item.id_lote} não encontrado`)

        const custoUnitario = lote.preco_unitario || 0
        const valorVendaUnitario = lote.skus?.valor_venda || 0

        const custoTotalItem = custoUnitario * item.quantidade
        const valorVendaTotalItem = valorVendaUnitario * item.quantidade

        return {
          ...item,
          lote,
          custoTotalItem,
          valorVendaTotalItem
        }
      })

      // 2. Calcular Totais da Venda
      const precoTotal = insumosDetalhados.reduce((acc, item) => acc + item.valorVendaTotalItem, 0)
      const custoTotal = insumosDetalhados.reduce((acc, item) => acc + item.custoTotalItem, 0)

      const descontoValor = venda.desconto_valor || 0
      const precoFinal = precoTotal - descontoValor
      const descontoPercentual = precoTotal > 0 ? (descontoValor / precoTotal) * 100 : 0

      const margemTotal = precoTotal - custoTotal
      const margemPercentual = precoTotal > 0 ? (margemTotal / precoTotal) * 100 : 0

      const margemTotalFinal = precoFinal - custoTotal
      const margemPercentualFinal = precoFinal > 0 ? (margemTotalFinal / precoFinal) * 100 : 0

      const parametros = await this.getParametros()
      let custoTaxaCartao = 0

      if (venda.metodo_pagamento === 'Crédito') {
        custoTaxaCartao = precoFinal * (parametros.taxa_cartao_pct / 100)
      }

      const valorEntrada = venda.valor_entrada || 0
      const valorParcelado = Math.max(0, precoFinal - valorEntrada)
      const numeroParcelas = venda.metodo_pagamento === 'Crédito' ? (venda.parcelas || 1) : null

      // ✅ Construir campo items no formato correto [{"id": sku_id, "qtd": quantidade}]
      const itemsFormatted = insumosDetalhados.map(item => ({
        id: item.lote.skus?.id_sku || item.lote.id_sku,
        qtd: item.quantidade
      }))

      console.log('📦 ITEMS FORMATADOS:', JSON.stringify(itemsFormatted))

      // 3. Criar Venda
      const vendaCompleta = ensureClinicFilter({
        id_paciente: venda.id_paciente,
        id_profissional: venda.id_profissional || null,
        data_venda: venda.data_venda,
        metodo_pagamento: venda.metodo_pagamento,
        parcelas: numeroParcelas,

        preco_total: precoTotal,
        custo_total: custoTotal,
        margem_total: margemTotal,
        custo_taxa_cartao: custoTaxaCartao,

        desconto_valor: descontoValor,
        desconto_percentual: descontoPercentual,
        preco_final: precoFinal,
        margem_percentual: margemPercentual,
        margem_percentual_final: margemPercentualFinal,
        margem_total_final: margemTotalFinal,
        valor_entrada: valorEntrada,
        valor_parcelado: valorParcelado,

        items: itemsFormatted as any
      })

      console.log('💾 SALVANDO VENDA COM ITEMS:', vendaCompleta.items)

      const { data: vendaCriada, error: vendaError } = await supabase
        .from('vendas')
        .insert(vendaCompleta)
        .select()
        .single()

      if (vendaError) throw vendaError

      // 4. Baixar Estoque dos Lotes (items já estão no JSONB da venda)
      for (const item of insumosDetalhados) {
        const novaQuantidade = item.lote.quantidade_disponivel - item.quantidade
        await this.updateLoteQuantidade(item.id_lote, novaQuantidade)

        await this.createMovimentacao({
          id_lote: item.id_lote,
          tipo_movimentacao: 'SAIDA',
          quantidade: item.quantidade,
          usuario: 'Sistema (Venda)',
          observacao: 'Baixa automática na venda'
        })
      }

      console.log('✅ VENDA CRIADA COM ITEMS:', vendaCriada.id, vendaCriada.items)

      // ✅ NOVO: Criar despesa de comissão se profissional for comissionado
      if (venda.id_profissional) {
        await this.criarDespesaComissao({
          id: vendaCriada.id,
          id_profissional: venda.id_profissional,
          preco_final: precoFinal,
          data_venda: venda.data_venda
        })
      }

      return vendaCriada

    } catch (error) {
      console.error('💥 ERRO createVenda:', error)
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

      const isRoleAdmin = data.role === 'admin'
      const nomeClinica = (data.clinicas as any)?.nome_clinica || ''
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
        plano: 'basico',
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
    usuario_base: string
  }) {
    try {
      const usuarioAdmin = `admin.${adminData.usuario_base}`
      const senhaInicial = `${adminData.usuario_base}123`

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
      return data || []
    } catch (error) {
      console.error('💥 ERRO GERAL getPacientes:', error)
      return []
    }
  },

  // CRIAR PACIENTE
  async createPaciente(paciente: {
    nome_completo: string
    cpf: string
    data_nascimento?: string
    genero?: string
    celular?: string
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

  // ATUALIZAR PACIENTE
  async updatePaciente(id: number, updates: {
    nome_completo?: string
    cpf?: string
    data_nascimento?: string
    genero?: string
    celular?: string
    email?: string
    origem_lead?: string
    endereco_completo?: string
    status_paciente?: string
  }) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const updatesWithTimestamp = {
        ...updates,
        data_ultima_atualizacao: new Date().toISOString()
      }

      console.log(`📝 ATUALIZANDO PACIENTE ${id} PARA CLÍNICA: ${clinicId}`)

      const { data, error } = await supabase
        .from('pacientes')
        .update(updatesWithTimestamp)
        .eq('id_paciente', id)
        .eq('id_clinica', clinicId)
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

  // BUSCAR PACIENTES PARA DASHBOARD IA
  async searchPacientes(searchTerm: string) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return []

      console.log(`🔍 BUSCANDO PACIENTES IA: "${searchTerm}"`)

      const cleanTerm = searchTerm.replace(/[^\d]/g, '')

      const { data, error } = await supabase
        .from('pacientes')
        .select('id_paciente, nome_completo, cpf, data_nascimento, celular')
        .eq('id_clinica', clinicId)
        .or(`nome_completo.ilike.%${searchTerm}%,cpf.eq.${cleanTerm}`)
        .limit(10)

      if (error) throw error

      console.log(`📋 PACIENTES ENCONTRADOS: ${data?.length || 0}`)
      return data || []
    } catch (error) {
      console.error('💥 ERRO searchPacientes:', error)
      return []
    }
  },

  // ============ PRODUTOS/ESTOQUE ============

  // ✅ OTIMIZADO: Produtos com JOIN em memória (elimina N+1 queries)
  // ANTES: 1 query SKUs + N queries lotes (66 roundtrips para 65 SKUs)
  // DEPOIS: 1 query SKUs + 1 query lotes (2 roundtrips total)
  async getProdutos() {
    try {
      const clinicId = getCurrentClinicId()
      console.log(`📦 BUSCANDO PRODUTOS PARA CLÍNICA: ${clinicId}`)

      if (!clinicId) throw new Error('Clínica não identificada')

      // ✅ Query 1: Buscar todos os SKUs ativos
      const { data: skus, error: skusError } = await supabase
        .from('skus')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('status_estoque', 'Ativo')

      if (skusError) throw skusError

      if (!skus || skus.length === 0) {
        console.log('📊 PRODUTOS ENCONTRADOS: 0')
        return []
      }

      // ✅ Query 2: Buscar TODOS os lotes com estoque disponível para esta clínica
      // Usa o índice idx_lotes_clinica_disponiveis para performance
      const { data: todosLotes, error: lotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('id_clinica', clinicId)
        .gt('quantidade_disponivel', 0)

      if (lotesError) {
        console.error('❌ ERRO LOTES:', lotesError)
        // Fallback: retornar SKUs sem lotes
        return skus.map(sku => ({ ...sku, lotes: [] }))
      }

      // ✅ JOIN em memória: Agrupar lotes por id_sku
      const lotesPorSku = new Map<number, any[]>()
      ;(todosLotes || []).forEach(lote => {
        const skuId = lote.id_sku
        if (!lotesPorSku.has(skuId)) {
          lotesPorSku.set(skuId, [])
        }
        lotesPorSku.get(skuId)!.push(lote)
      })

      // ✅ Montar resultado: SKU + seus lotes
      const produtosComLotes = skus.map(sku => ({
        ...sku,
        lotes: lotesPorSku.get(sku.id_sku) || []
      }))

      console.log(`📊 PRODUTOS ENCONTRADOS: ${produtosComLotes.length} (${todosLotes?.length || 0} lotes totais)`)
      return produtosComLotes
    } catch (error) {
      console.error('💥 ERRO getProdutos:', error)
      return []
    }
  },

  // Criar movimentação com VALIDAÇÃO RIGOROSA
  async createMovimentacao(movimentacao: {
    id_lote: number
    tipo_movimentacao: 'ENTRADA' | 'SAIDA' | string
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
        .eq('id_clinica', clinicId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('💥 ERRO updateLoteQuantidade:', error)
      throw error
    }
  },

  // Criar lote com cálculo automático de preço unitário
  async createLoteComValor(lote: {
    id_sku: number
    quantidade_disponivel: number
    validade: string
    valor_total_compra: number
  }) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      // 1. Buscar fator_divisao do SKU
      const { data: skuData, error: skuError } = await supabase
        .from('skus')
        .select('fator_divisao')
        .eq('id_sku', lote.id_sku)
        .eq('id_clinica', clinicId)
        .single()

      if (skuError) throw new Error('SKU não encontrado')

      // 2. Calcular preco_unitario
      const fatorDivisao = parseFloat(skuData.fator_divisao || '1')
      const precoPorUnidade = lote.valor_total_compra / lote.quantidade_disponivel
      const precoUnitario = precoPorUnidade / fatorDivisao

      console.log('📊 CÁLCULO PREÇO UNITÁRIO:', {
        valor_total: lote.valor_total_compra,
        quantidade: lote.quantidade_disponivel,
        fator_divisao: fatorDivisao,
        preco_unitario: precoUnitario
      })

      // 3. Criar lote com preço calculado
      const loteCompleto = ensureClinicFilter({
        id_sku: lote.id_sku,
        quantidade_disponivel: lote.quantidade_disponivel,
        validade: lote.validade,
        preco_unitario: precoUnitario,
        data_entrada: new Date().toISOString()
      })

      const { data, error } = await supabase
        .from('lotes')
        .insert(loteCompleto)
        .select()
        .single()

      if (error) throw error
      console.log('✅ LOTE CRIADO COM VALOR:', data.id_lote)
      return data
    } catch (error) {
      console.error('💥 ERRO createLoteComValor:', error)
      throw error
    }
  },

  // ============ RESUMOS DIÁRIOS E SEMANAIS ============

  async getResumosDiariosPaciente(cpf: string) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return []

      const cpfLimpo = cpf.replace(/\D/g, '')

      const { data, error } = await supabase
        .from('resumos_diarios_paciente')
        .select('*')
        .eq('cpf', cpfLimpo)
        .eq('id_clinica', clinicId)
        .order('data_resumo', { ascending: false })
        .limit(30)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('💥 ERRO getResumosDiariosPaciente:', error)
      return []
    }
  },

  async getResumoEspecifico(cpf: string, dataResumo: string) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return null

      const cpfLimpo = cpf.replace(/\D/g, '')

      console.log(`🔍 BUSCANDO RESUMO: CPF=${cpfLimpo}, DATA=${dataResumo}`)

      const { data, error } = await supabase
        .from('resumos_diarios_paciente')
        .select('*')
        .eq('cpf', cpfLimpo)
        .eq('id_clinica', clinicId)
        .eq('data_resumo', dataResumo)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('💥 ERRO getResumoEspecifico:', error)
        return null
      }

      if (data) {
        console.log(`✅ RESUMO ENCONTRADO: ${data.data_resumo}`)
        return data
      }

      console.log(`❌ DATA SOLICITADA "${dataResumo}" NÃO ENCONTRADA`)
      return null

    } catch (error) {
      console.error('💥 ERRO CRÍTICO getResumoEspecifico:', error)
      return null
    }
  },

  // ============ OUTRAS FUNÇÕES ============

  // PROCEDIMENTOS (isolamento por clínica)
  async getProcedimentos(limit = 100) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return []

      const { data, error } = await supabase
        .from('procedimentos')
        .select('*')
        .eq('id_clinica', clinicId)
        .order('data_procedimento', { ascending: false })
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
        .from('reviews_google')
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
  },

  async getMovimentacoes(limit = 100) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      // 1. Buscar movimentações (query simples, sem JOIN)
      const { data: movimentacoes, error } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .eq('id_clinica', clinicId)
        .order('data_movimentacao', { ascending: false })
        .limit(limit)

      if (error) throw error
      if (!movimentacoes || movimentacoes.length === 0) return []

      // 2. Buscar lotes únicos
      const loteIds = Array.from(
        new Set(
          movimentacoes
            .map(m => m.id_lote)
            .filter((id): id is number => id != null)
        )
      )

      if (loteIds.length === 0) return movimentacoes

      const { data: lotes } = await supabase
        .from('lotes')
        .select('id_lote, id_sku, validade, quantidade_disponivel, preco_unitario')
        .in('id_lote', loteIds)

      // 3. Buscar SKUs únicos
      const skuIds = Array.from(
        new Set(
          (lotes || [])
            .map(l => l.id_sku)
            .filter((id): id is number => id != null)
        )
      )

      let skuMap = new Map()
      if (skuIds.length > 0) {
        const { data: skus } = await supabase
          .from('skus')
          .select('id_sku, nome_produto, fabricante, classe_terapeutica')
          .in('id_sku', skuIds)

        skuMap = new Map((skus || []).map(s => [s.id_sku, s]))
      }

      // 4. Criar mapa de lotes
      const loteMap = new Map(
        (lotes || []).map(l => [
          l.id_lote,
          {
            ...l,
            skus: skuMap.get(l.id_sku) || null
          }
        ])
      )

      // 5. Enriquecer movimentações
      const movimentacoesEnriquecidas = movimentacoes.map(mov => ({
        ...mov,
        lote: loteMap.get(mov.id_lote) || null
      }))

      console.log(`📦 MOVIMENTAÇÕES CARREGADAS: ${movimentacoesEnriquecidas.length}`)
      return movimentacoesEnriquecidas
    } catch (error) {
      console.error('💥 ERRO getMovimentacoes:', error)
      return []
    }
  },

  // ✅ Função auxiliar para trocar clínica (usado pelo admin geral)
  trocarClinica(clinicId: number, clinicInfo?: any) {
    setCurrentClinic(clinicId, clinicInfo)
  },

  // ============ DASHBOARD - VENDAS POR DIA ============
  
  async getVendasPorDia(ano: number, mes: number) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
      const ultimoDia = new Date(ano, mes, 0).getDate()
      const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

      console.log(`📅 BUSCANDO VENDAS: ${dataInicio} até ${dataFim}`)

      const { data, error } = await supabase
        .from('vendas')
        .select('id, data_venda, preco_final, preco_total')
        .eq('id_clinica', clinicId)
        .gte('data_venda', dataInicio)
        .lte('data_venda', dataFim)
        .order('data_venda', { ascending: true })

      if (error) throw error

      console.log(`📊 VENDAS RETORNADAS DO BANCO: ${data?.length || 0}`)
      console.log('📋 DATAS DAS VENDAS:', data?.map(v => v.data_venda))

      // Agrupar por dia - ✅ Extrair dia diretamente da string para evitar bug de timezone
      const vendasPorDia: Record<number, number> = {}
      ;(data || []).forEach(venda => {
        // Extrair dia da string "YYYY-MM-DD" diretamente (evita conversão timezone)
        const dataStr = String(venda.data_venda).substring(0, 10)
        const dia = parseInt(dataStr.split('-')[2], 10)
        const valor = venda.preco_final || venda.preco_total || 0
        vendasPorDia[dia] = (vendasPorDia[dia] || 0) + valor
        console.log(`  → Venda ID ${venda.id}: data=${dataStr}, dia=${dia}, valor=${valor}`)
      })

      console.log(`📊 VENDAS POR DIA AGRUPADAS:`, vendasPorDia)
      return vendasPorDia
    } catch (error) {
      console.error('💥 ERRO getVendasPorDia:', error)
      return {}
    }
  },

  // ============ DASHBOARD - VENDAS POR CATEGORIA ============
  
  async getVendasPorCategoria(ano: number, meses: number[]) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const dataInicio = `${ano}-${String(Math.min(...meses)).padStart(2, '0')}-01`
      const ultimoMes = Math.max(...meses)
      const ultimoDia = new Date(ano, ultimoMes, 0).getDate()
      const dataFim = `${ano}-${String(ultimoMes).padStart(2, '0')}-${ultimoDia}`

      // 1. Buscar vendas no período
      const { data: vendas, error: vendasError } = await supabase
        .from('vendas')
        .select('id, items')
        .eq('id_clinica', clinicId)
        .gte('data_venda', dataInicio)
        .lte('data_venda', dataFim)

      if (vendasError) throw vendasError

      // 2. Extrair todos os SKU IDs das vendas
      const skuQuantidades: Record<number, number> = {}
      ;(vendas || []).forEach(venda => {
        if (venda.items && Array.isArray(venda.items)) {
          venda.items.forEach((item: any) => {
            if (item.id && item.qtd) {
              skuQuantidades[item.id] = (skuQuantidades[item.id] || 0) + item.qtd
            }
          })
        }
      })

      // 3. Buscar categorias dos SKUs
      const skuIds = Object.keys(skuQuantidades).map(Number)
      if (skuIds.length === 0) {
        return { toxina: 0, preenchedor: 0, biotech: 0, total: 0 }
      }

      const { data: skus, error: skusError } = await supabase
        .from('skus')
        .select('id_sku, classe_terapeutica')
        .in('id_sku', skuIds)

      if (skusError) throw skusError

      // 4. Mapear SKU -> Categoria
      const skuCategoriaMap: Record<number, string> = {}
      ;(skus || []).forEach(sku => {
        skuCategoriaMap[sku.id_sku] = sku.classe_terapeutica || 'Outros'
      })

      // 5. Somar quantidades por grupo
      let toxina = 0
      let preenchedor = 0
      let biotech = 0

      Object.entries(skuQuantidades).forEach(([skuId, qtd]) => {
        const categoria = skuCategoriaMap[Number(skuId)] || 'Outros'
        
        if (categoria === 'Toxina Botulínica') {
          toxina += qtd
        } else if (categoria === 'Preenchedor') {
          preenchedor += qtd
        } else {
          // Bioestimulador, Bioregenerador, Tecnologias, Outros
          biotech += qtd
        }
      })

      const total = toxina + preenchedor + biotech

      console.log(`📊 VENDAS POR CATEGORIA: Toxina=${toxina}, Preenchedor=${preenchedor}, Bio/Tech=${biotech}`)
      return { toxina, preenchedor, biotech, total }
    } catch (error) {
      console.error('💥 ERRO getVendasPorCategoria:', error)
      return { toxina: 0, preenchedor: 0, biotech: 0, total: 0 }
    }
  },

  // ============ DASHBOARD - DADOS COMPLETOS ============
  
  async getDashboardData(ano: number, mes: number) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      // Buscar todos os dados em paralelo
      const [vendasPorDia, vendasPorCategoria, parametros, despesas, vendas] = await Promise.all([
        this.getVendasPorDia(ano, mes),
        this.getVendasPorCategoria(ano, [mes]),
        this.getParametros(),
        this.getDespesas(),
        this.getVendas(ano, [mes])
      ])

      // Calcular totais do mês
      const receitaBruta = vendas.reduce((sum, v) => sum + (v.preco_final || v.preco_total || 0), 0)
      const custoTotal = vendas.reduce((sum, v) => sum + (v.custo_total || 0), 0)

      console.log(`📊 DASHBOARD DATA: Receita=${receitaBruta}, Custo=${custoTotal}`)

      return {
        vendasPorDia,
        vendasPorCategoria,
        parametros,
        despesas,
        vendas,
        totais: {
          receitaBruta,
          custoTotal,
          margemContribuicao: receitaBruta - custoTotal
        }
      }
    } catch (error) {
      console.error('💥 ERRO getDashboardData:', error)
      throw error
    }
  },

  // ✅ FUNÇÃO: Calcular média de saída por SKU (últimos 30 dias)
  async getMediaSaidaPorSku(): Promise<Record<number, number>> {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) return {}

      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 30)

      const { data: movimentacoes, error } = await supabase
        .from('movimentacoes_estoque')
        .select('id_lote, quantidade, tipo_movimentacao')
        .eq('id_clinica', clinicId)
        .eq('tipo_movimentacao', 'SAIDA')
        .gte('data_movimentacao', dataLimite.toISOString())

      if (error || !movimentacoes) return {}

      // Buscar lotes para mapear para SKU
      const loteIds = Array.from(new Set(movimentacoes.map(m => m.id_lote).filter(Boolean)))
      if (loteIds.length === 0) return {}

      const { data: lotes } = await supabase
        .from('lotes')
        .select('id_lote, id_sku')
        .in('id_lote', loteIds)

      if (!lotes) return {}

      const loteToSku = new Map(lotes.map(l => [l.id_lote, l.id_sku]))

      // Agrupar saídas por SKU
      const saidasPorSku: Record<number, number> = {}
      movimentacoes.forEach(m => {
        const idSku = loteToSku.get(m.id_lote)
        if (idSku) {
          saidasPorSku[idSku] = (saidasPorSku[idSku] || 0) + m.quantidade
        }
      })

      // Calcular média diária (total / 30 dias)
      const mediaPorSku: Record<number, number> = {}
      Object.entries(saidasPorSku).forEach(([idSku, total]) => {
        mediaPorSku[Number(idSku)] = total / 30
      })

      return mediaPorSku
    } catch (error) {
      console.error('💥 ERRO getMediaSaidaPorSku:', error)
      return {}
    }
  },

  // ✅ FUNÇÃO: Calcular status inteligente de estoque
  calcularStatusEstoque(estoqueAtual: number, mediaSaidaDiaria: number): { status: string; cor: string; diasEstoque: number } {
    // Se não tem média de saída (produto sem movimentação)
    if (!mediaSaidaDiaria || mediaSaidaDiaria === 0) {
      if (estoqueAtual > 0) {
        return { status: 'Sem Saída', cor: 'gray', diasEstoque: 999 }
      }
      return { status: 'Sem Estoque', cor: 'gray', diasEstoque: 0 }
    }

    const diasEstoque = Math.round(estoqueAtual / mediaSaidaDiaria)

    // Lógica baseada em dias de estoque
    if (diasEstoque < 4) {
      return { status: 'Crítico', cor: 'red', diasEstoque }
    }
    if (diasEstoque < 7) {
      return { status: 'Baixo', cor: 'yellow', diasEstoque }
    }
    if (diasEstoque <= 14) {
      return { status: 'OK', cor: 'green', diasEstoque }
    }
    return { status: 'Alto', cor: 'blue', diasEstoque }
  },

  // ============================================================
  // ✅ NOVAS FUNÇÕES - ITEM 1 E 2
  // ============================================================

  // ✅ ITEM 1: Auto-cálculo do valor_venda para SKU "Locação de Sala"
  // Fórmula: valor_venda = custo_hora * fator_correcao_marca
  async updateSkuLocacaoSala() {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      // 1. Buscar parâmetros atuais
      const { data: parametros, error: paramError } = await supabase
        .from('parametros')
        .select('custo_hora, fator_correcao_marca')
        .eq('id_clinica', clinicId)
        .single()

      if (paramError || !parametros) {
        console.warn('⚠️ Parâmetros não encontrados para calcular Locação de Sala')
        return null
      }

      const custoHora = parametros.custo_hora || 0
      const fatorCorrecao = parametros.fator_correcao_marca || 1

      // Se custo_hora não está definido, não atualizar
      if (!custoHora || custoHora === 0) {
        console.warn('⚠️ custo_hora não definido - SKU Locação de Sala não atualizado')
        return null
      }

      // 2. Calcular novo valor_venda
      const novoValorVenda = custoHora * fatorCorrecao

      console.log('🏠 CÁLCULO LOCAÇÃO DE SALA:', {
        custo_hora: custoHora,
        fator_correcao_marca: fatorCorrecao,
        valor_venda: novoValorVenda
      })

      // 3. Atualizar SKU "Locação de Sala" (buscar por nome)
      const { data: skuAtualizado, error: updateError } = await supabase
        .from('skus')
        .update({ valor_venda: novoValorVenda })
        .eq('id_clinica', clinicId)
        .ilike('nome_produto', '%Locação de Sala%')
        .select()

      if (updateError) {
        console.error('❌ Erro ao atualizar SKU Locação de Sala:', updateError)
        throw updateError
      }

      if (skuAtualizado && skuAtualizado.length > 0) {
        console.log('✅ SKU LOCAÇÃO DE SALA ATUALIZADO:', {
          id_sku: skuAtualizado[0].id_sku,
          nome: skuAtualizado[0].nome_produto,
          valor_venda: novoValorVenda
        })
      } else {
        console.warn('⚠️ SKU "Locação de Sala" não encontrado para esta clínica')
      }

      return skuAtualizado?.[0] || null
    } catch (error) {
      console.error('💥 ERRO updateSkuLocacaoSala:', error)
      return null
    }
  },

  // ✅ ITEM 2: Criar despesa de comissão para profissional comissionado
  // Chamado automaticamente após criar uma venda com profissional comissionado
  async criarDespesaComissao(venda: {
    id: number
    id_profissional: number | null
    preco_final: number
    data_venda: string
  }) {
    try {
      // Se não tem profissional, ignorar
      if (!venda.id_profissional) {
        console.log('⏭️ Venda sem profissional - sem comissão')
        return null
      }

      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      // 1. Buscar dados do profissional
      const { data: profissional, error: profError } = await supabase
        .from('profissionais')
        .select('id, nome, perfil, percentual_profissional')
        .eq('id', venda.id_profissional)
        .eq('id_clinica', clinicId)
        .single()

      if (profError || !profissional) {
        console.warn('⚠️ Profissional não encontrado:', venda.id_profissional)
        return null
      }

      // 2. Verificar se é comissionado
      if (profissional.perfil !== 'comissionado') {
        console.log(`⏭️ Profissional ${profissional.nome} é ${profissional.perfil} - sem comissão`)
        return null
      }

      // 3. Verificar se tem percentual definido
      const percentual = profissional.percentual_profissional || 0
      if (percentual <= 0) {
        console.warn(`⚠️ Profissional ${profissional.nome} não tem percentual definido`)
        return null
      }

      // 4. Calcular valor da comissão
      const valorComissao = venda.preco_final * (percentual / 100)

      console.log('💰 CÁLCULO COMISSÃO:', {
        profissional: profissional.nome,
        perfil: profissional.perfil,
        percentual: percentual,
        valor_venda: venda.preco_final,
        comissao: valorComissao
      })

      // 5. Extrair mês/ano da venda para o período
      const dataVenda = new Date(venda.data_venda)
      const periodo = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}-01`

      // 6. Criar despesa como "Custo Variável"
      const despesaComissao = {
        id_clinica: clinicId,
        tipo: 'Custo Variável' as const,
        categoria: 'Comissões',
        item: `Comissão ${profissional.nome} - Venda #${venda.id}`,
        valor_mensal: valorComissao,
        periodo: periodo,
        ativo: true
      }

      const { data: despesaCriada, error: despesaError } = await supabase
        .from('despesas')
        .insert(despesaComissao)
        .select()
        .single()

      if (despesaError) {
        console.error('❌ Erro ao criar despesa de comissão:', despesaError)
        throw despesaError
      }

      console.log('✅ DESPESA COMISSÃO CRIADA:', {
        id: despesaCriada.id,
        profissional: profissional.nome,
        valor: valorComissao,
        venda_id: venda.id
      })

      return despesaCriada
    } catch (error) {
      console.error('💥 ERRO criarDespesaComissao:', error)
      return null
    }
  }
}