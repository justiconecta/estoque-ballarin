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

  // ✅ ATUALIZADO: Incluindo campo tipo na criação de despesa
  async createDespesa(despesa: {
    tipo?: TipoDespesa
    categoria: string
    item: string
    valor_mensal: number
  }) {
    try {
      const despesaCompleta = ensureClinicFilter({
        tipo: despesa.tipo || 'Despesa Fixa', // Default para compatibilidade
        categoria: despesa.categoria,
        item: despesa.item,
        valor_mensal: despesa.valor_mensal,
        ativo: true
      })

      const { data, error } = await supabase
        .from('despesas')
        .insert(despesaCompleta)
        .select()
        .single()

      if (error) throw error
      console.log('✅ DESPESA CRIADA:', data.item, '- Tipo:', data.tipo)
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
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) throw error
      console.log(`👥 PROFISSIONAIS ENCONTRADOS: ${data?.length || 0}`)
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
        meta_resultado_liquido_mensal: 65000.00
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

  async updateParametros(updates: Partial<{
    numero_salas: number
    horas_trabalho_dia: number
    duracao_media_servico_horas: number
    mod_padrao: number
    aliquota_impostos_pct: number
    taxa_cartao_pct: number
    meta_resultado_liquido_mensal: number
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

      if (error) throw error
      console.log('✅ PARÂMETROS ATUALIZADOS')
      return data
    } catch (error) {
      console.error('💥 ERRO updateParametros:', error)
      throw error
    }
  },

  // ============ MÓDULO FINANCEIRO - VENDAS ============

  async getVendas(ano: number, meses: number[]) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      // Construir filtro de datas
      const dataInicio = `${ano}-${String(Math.min(...meses)).padStart(2, '0')}-01`
      const ultimoMes = Math.max(...meses)
      const ultimoDia = new Date(ano, ultimoMes, 0).getDate()
      const dataFim = `${ano}-${String(ultimoMes).padStart(2, '0')}-${ultimoDia}`

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

      // Buscar serviços de cada venda
      const vendasComServicos = await Promise.all(
        (data || []).map(async (venda) => {
          const { data: servicos } = await supabase
            .from('venda_servicos')
            .select(`
              *,
              servicos:id_servico (
                nome
              )
            `)
            .eq('id_venda', venda.id)

          return {
            ...venda,
            servicos: servicos || []
          }
        })
      )

      console.log(`💵 VENDAS ENCONTRADAS: ${vendasComServicos.length}`)
      return vendasComServicos
    } catch (error) {
      console.error('💥 ERRO getVendas:', error)
      return []
    }
  },

  /**
   * ✅ Buscar todos os SKUs da clínica
   */
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

  /**
   * ✅ Atualizar categoria e fator_divisao de um SKU
   */
  async updateSKU(id_sku: number, updates: {
    classe_terapeutica?: string
    fator_divisao?: string
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

  async createVenda(venda: {
    id_paciente: number
    data_venda: string
    metodo_pagamento: 'PIX' | 'Débito' | 'Crédito'
    parcelas?: number
    desconto_valor?: number
    valor_entrada?: number
    insumos: {
      id_lote: number
      quantidade: number
    }[]
  }) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      if (!venda.insumos || venda.insumos.length === 0) {
        throw new Error('Nenhum insumo selecionado para a venda')
      }

      // 1. Buscar dados dos lotes e SKUs para cálculos
      const insumosDetalhados = await Promise.all(venda.insumos.map(async (item) => {
        const { data: lote, error: loteError } = await supabase
          .from('lotes')
          .select('*, skus:id_sku(id_sku, nome_produto, valor_venda, classe_terapeutica)')
          .eq('id_lote', item.id_lote)
          .single()

        if (loteError || !lote) throw new Error(`Lote ${item.id_lote} não encontrado`)

        // Cálculos por Item
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
      }))

      // 2. Calcular Totais da Venda
      const precoTotal = insumosDetalhados.reduce((acc, item) => acc + item.valorVendaTotalItem, 0)
      const custoTotal = insumosDetalhados.reduce((acc, item) => acc + item.custoTotalItem, 0)

      const descontoValor = venda.desconto_valor || 0
      const precoFinal = precoTotal - descontoValor
      const descontoPercentual = precoTotal > 0 ? (descontoValor / precoTotal) * 100 : 0

      // Margens
      const margemTotal = precoTotal - custoTotal
      const margemPercentual = precoTotal > 0 ? (margemTotal / precoTotal) * 100 : 0

      const margemTotalFinal = precoFinal - custoTotal
      const margemPercentualFinal = precoFinal > 0 ? (margemTotalFinal / precoFinal) * 100 : 0

      // Pagamento e Parcelamento
      const parametros = await this.getParametros()
      let custoTaxaCartao = 0

      if (venda.metodo_pagamento === 'Crédito') {
        custoTaxaCartao = precoFinal * (parametros.taxa_cartao_pct / 100)
      }

      const valorEntrada = venda.valor_entrada || 0
      const valorParcelado = Math.max(0, precoFinal - valorEntrada)
      const numeroParcelas = venda.metodo_pagamento === 'Crédito' ? (venda.parcelas || 1) : null

      // 3. Criar Venda
      const vendaCompleta = ensureClinicFilter({
        id_paciente: venda.id_paciente,
        id_usuario_responsavel: null,
        data_venda: venda.data_venda,
        metodo_pagamento: venda.metodo_pagamento,
        parcelas: numeroParcelas,

        preco_total: precoTotal,
        custo_total: custoTotal,
        margem_total: margemTotal,
        custo_taxa_cartao: custoTaxaCartao,

        // Campos calculados
        desconto_valor: descontoValor,
        desconto_percentual: descontoPercentual,
        preco_final: precoFinal,
        margem_percentual: margemPercentual,
        margem_percentual_final: margemPercentualFinal,
        margem_total_final: margemTotalFinal,
        valor_entrada: valorEntrada,
        valor_parcelado: valorParcelado
      })

      const { data: vendaCriada, error: vendaError } = await supabase
        .from('vendas')
        .insert(vendaCompleta)
        .select()
        .single()

      if (vendaError) throw vendaError

      // 4. Inserir Itens da Venda (venda_insumos) e Baixar Estoque
      for (const item of insumosDetalhados) {
        // Inserir na tabela de relacionamento
        await supabase.from('venda_insumos').insert({
          id_venda: vendaCriada.id,
          id_lote: item.id_lote,
          quantidade: item.quantidade,
          custo_total: item.custoTotalItem,
          valor_venda_total: item.valorVendaTotalItem
        })

        // Baixar Estoque
        const novaQuantidade = item.lote.quantidade_disponivel - item.quantidade
        await this.updateLoteQuantidade(item.id_lote, novaQuantidade)

        // Registrar Movimentação de Saída
        await this.createMovimentacao({
          id_lote: item.id_lote,
          tipo_movimentacao: 'SAIDA',
          quantidade: item.quantidade,
          usuario: 'Sistema (Venda)',
          observacao: `Venda #${vendaCriada.id}`
        })
      }

      console.log('✅ VENDA CRIADA COM INSUMOS:', vendaCriada.id)
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
      const nomeClinica = data.clinicas?.[0]?.nome_clinica || ''
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

  /**
   * ✅ Criar lote com cálculo automático de preço unitário
   * Fórmula: preco_unitario = (valor_total_compra / quantidade_disponivel) / fator_divisao
   */
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

  // MOVIMENTAÇÕES DE ESTOQUE
  async getMovimentacoes(limit = 100) {
    try {
      const clinicId = getCurrentClinicId()
      if (!clinicId) throw new Error('Clínica não identificada')

      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          lotes:id_lote (
            id_sku,
            validade,
            skus:id_sku (
              nome_produto
            )
          )
        `)
        .eq('id_clinica', clinicId)
        .order('data_movimentacao', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('💥 ERRO getMovimentacoes:', error)
      return []
    }
  }
}