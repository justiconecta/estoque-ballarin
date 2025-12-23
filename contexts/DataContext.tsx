'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { supabaseApi } from '@/lib/supabase'

// ============ TIPOS ============
interface DataContextType {
  // Dados base
  servicos: any[]
  despesas: any[]
  profissionais: any[]
  parametros: any | null
  skus: any[]
  produtosComLotes: any[]
  pacientes: any[]
  
  // Estados
  loading: boolean
  initialized: boolean
  
  // Ações base
  loadAllData: () => Promise<void>
  refreshData: (keys?: string[]) => Promise<void>
  invalidateCache: () => void
  
  // Updates locais
  updateParametrosLocal: (updates: Record<string, any>) => Promise<void>
  addDespesaLocal: (despesa: any) => void
  addProfissionalLocal: (profissional: any) => void
  removeProfissionalLocal: (id: number) => void
  updateProfissionalLocal: (id: number, updates: any) => void
  
  // Vendas
  getVendas: (ano: number, meses: number[]) => Promise<any[]>
  clearVendasCache: () => void
  
  // Dashboard Vendas
  getVendasPorDia: (ano: number, mes: number) => Promise<Record<number, number>>
  getVendasPorCategoria: (ano: number, meses: number[]) => Promise<{ toxina: number; preenchedor: number; biotech: number; total: number }>
  
  // Dashboard Marketing
  getResumoIndicadoresMensal: (mesAno: string) => Promise<any | null>
  getAnosDisponiveis: () => Promise<string[]>
  
  // Dashboard Terapêutico
  getResumosDiariosPaciente: (cpf: string) => Promise<any[]>
  getResumosSemanaisPaciente: (cpf: string) => Promise<any[]>
  getResumoEspecifico: (cpf: string, dataResumo: string) => Promise<any | null>
  getPacientesComResumos: () => Promise<any[]>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// ============ PROVIDER ============
export function DataProvider({ children }: { children: ReactNode }) {
  // Refs
  const isLoadingRef = useRef(false)
  const isInitializedRef = useRef(false)
  const lastClinicIdRef = useRef<number | null>(null)
  const lastLoadTimestamp = useRef<number>(0)
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estados de dados
  const [servicos, setServicos] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [parametros, setParametros] = useState<any | null>(null)
  const [skus, setSKUs] = useState<any[]>([])
  const [produtosComLotes, setProdutosComLotes] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  
  // Estados de controle
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  // Caches
  const vendasCacheRef = useRef(new Map<string, { data: any[], timestamp: number }>())
  const vendasPorDiaCacheRef = useRef(new Map<string, { data: Record<number, number>, timestamp: number }>())
  const vendasPorCategoriaCacheRef = useRef(new Map<string, { data: any, timestamp: number }>())
  const resumoMensalCacheRef = useRef(new Map<string, { data: any, timestamp: number }>())
  const resumosDiariosCacheRef = useRef(new Map<string, { data: any[], timestamp: number }>())
  const resumosSemanaisCacheRef = useRef(new Map<string, { data: any[], timestamp: number }>())
  const resumoEspecificoCacheRef = useRef(new Map<string, { data: any, timestamp: number }>())

  // ============ LOAD ALL DATA ============
  const loadAllData = useCallback(async () => {
    // ✅ USA SUPABASEAPI DIRETAMENTE (lê do localStorage)
    const clinicId = supabaseApi.getCurrentClinicId()
    
    if (!clinicId) {
      console.log('⏳ DataContext: clinicId não disponível ainda...')
      return
    }
    
    if (isLoadingRef.current) {
      console.log('⏳ DataContext: Carregamento já em andamento...')
      return
    }
    
    const now = Date.now()
    if (isInitializedRef.current && (now - lastLoadTimestamp.current) < CACHE_TTL && lastClinicIdRef.current === clinicId) {
      console.log('📦 DataContext: Usando cache (TTL válido)')
      return
    }
    
    // Se mudou de clínica, limpar caches
    if (lastClinicIdRef.current && lastClinicIdRef.current !== clinicId) {
      console.log('🔄 DataContext: Clínica mudou, limpando caches...')
      vendasCacheRef.current.clear()
      vendasPorDiaCacheRef.current.clear()
      vendasPorCategoriaCacheRef.current.clear()
      resumoMensalCacheRef.current.clear()
      resumosDiariosCacheRef.current.clear()
      resumosSemanaisCacheRef.current.clear()
      resumoEspecificoCacheRef.current.clear()
    }
    
    isLoadingRef.current = true
    setLoading(true)
    
    console.log(`🚀 DataContext: Carregando dados para clínica ${clinicId}...`)
    
    try {
      const [
        servicosData,
        despesasData,
        profissionaisData,
        parametrosData,
        skusData,
        produtosData,
        pacientesData
      ] = await Promise.all([
        supabaseApi.getServicos(),
        supabaseApi.getDespesas(),
        supabaseApi.getProfissionais(),
        supabaseApi.getParametros(),
        supabaseApi.getSKUs(),
        supabaseApi.getProdutos(),
        supabaseApi.getPacientes()
      ])

      console.log('✅ DataContext: Dados carregados!')
      console.log(`   - Serviços: ${servicosData?.length || 0}`)
      console.log(`   - Despesas: ${despesasData?.length || 0}`)
      console.log(`   - Profissionais: ${profissionaisData?.length || 0}`)
      console.log(`   - SKUs: ${skusData?.length || 0}`)
      console.log(`   - Produtos: ${produtosData?.length || 0}`)
      console.log(`   - Pacientes: ${pacientesData?.length || 0}`)

      setServicos(servicosData || [])
      setDespesas(despesasData || [])
      setProfissionais(profissionaisData || [])
      setParametros(parametrosData || null)
      setSKUs(skusData || [])
      setPacientes(pacientesData || [])
      
      const produtosComEstoque = (produtosData || []).filter((p: any) => 
        p.lotes && p.lotes.length > 0 && p.lotes.some((l: any) => l.quantidade_disponivel > 0)
      )
      setProdutosComLotes(produtosComEstoque)
      
      lastClinicIdRef.current = clinicId
      lastLoadTimestamp.current = now
      isInitializedRef.current = true
      setInitialized(true)
      
      // Limpar retry interval se existir
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }
      
    } catch (error) {
      console.error('❌ DataContext: Erro ao carregar dados:', error)
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }, [])

  // ✅ AUTO-LOAD: Tentar carregar quando mount, com retry se clinicId não estiver pronto
  useEffect(() => {
    const tryLoad = () => {
      const clinicId = supabaseApi.getCurrentClinicId()
      if (clinicId && !isInitializedRef.current) {
        console.log('🔑 DataContext: clinicId encontrado, carregando...')
        loadAllData()
        return true
      }
      return false
    }
    
    // Tentar imediatamente
    if (!tryLoad()) {
      // Se não conseguiu, tentar a cada 200ms por até 5 segundos
      console.log('⏳ DataContext: Aguardando clinicId...')
      let attempts = 0
      retryIntervalRef.current = setInterval(() => {
        attempts++
        if (tryLoad() || attempts > 25) {
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current)
            retryIntervalRef.current = null
          }
          if (attempts > 25) {
            console.warn('⚠️ DataContext: Timeout aguardando clinicId')
          }
        }
      }, 200)
    }
    
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
      }
    }
  }, [loadAllData])

  // ✅ Observar mudanças no localStorage (para detectar login/logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clinic_id') {
        const newClinicId = e.newValue ? parseInt(e.newValue) : null
        if (newClinicId && newClinicId !== lastClinicIdRef.current) {
          console.log('🔄 DataContext: clinic_id mudou no localStorage')
          isInitializedRef.current = false
          loadAllData()
        } else if (!newClinicId) {
          // Logout
          console.log('🚪 DataContext: Logout detectado')
          isInitializedRef.current = false
          setInitialized(false)
          setServicos([])
          setDespesas([])
          setProfissionais([])
          setParametros(null)
          setSKUs([])
          setProdutosComLotes([])
          setPacientes([])
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [loadAllData])

  // ✅ LISTENER DE VISIBILIDADE - Recarrega quando usuário volta para a aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutos
        
        // Se passou muito tempo desde o último carregamento, invalidar cache
        if ((now - lastLoadTimestamp.current) > STALE_THRESHOLD && isInitializedRef.current) {
          console.log('👁️ DataContext: Aba voltou ao foco, cache pode estar stale')
          // Invalidar caches de vendas para forçar reload
          vendasCacheRef.current.clear()
          vendasPorDiaCacheRef.current.clear()
          vendasPorCategoriaCacheRef.current.clear()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // ============ REFRESH ESPECÍFICO ============
  const refreshData = useCallback(async (keys?: string[]) => {
    const clinicId = supabaseApi.getCurrentClinicId()
    if (!clinicId) return
    
    console.log('🔄 DataContext: Refresh:', keys || 'todos')
    
    if (!keys || keys.length === 0) {
      isInitializedRef.current = false
      await loadAllData()
      return
    }
    
    const refreshMap: Record<string, () => Promise<void>> = {
      servicos: async () => setServicos(await supabaseApi.getServicos() || []),
      despesas: async () => setDespesas(await supabaseApi.getDespesas() || []),
      profissionais: async () => setProfissionais(await supabaseApi.getProfissionais() || []),
      parametros: async () => setParametros(await supabaseApi.getParametros() || null),
      skus: async () => setSKUs(await supabaseApi.getSKUs() || []),
      pacientes: async () => setPacientes(await supabaseApi.getPacientes() || []),
      produtos: async () => {
        const produtosData = await supabaseApi.getProdutos() || []
        const produtosComEstoque = produtosData.filter((p: any) => 
          p.lotes && p.lotes.length > 0 && p.lotes.some((l: any) => l.quantidade_disponivel > 0)
        )
        setProdutosComLotes(produtosComEstoque)
      }
    }
    
    await Promise.all(keys.filter(key => refreshMap[key]).map(key => refreshMap[key]()))
  }, [loadAllData])

  // ============ UPDATE PARAMETROS ============
  const updateParametrosLocal = useCallback(async (updates: Record<string, any>) => {
    try {
      await supabaseApi.updateParametros(updates)
      setParametros((prev: any) => prev ? { ...prev, ...updates } : updates)
      console.log('✅ Parâmetros atualizados')
    } catch (error) {
      console.error('❌ Erro ao atualizar parâmetros:', error)
      throw error
    }
  }, [])

  // CRUD Local
  const addDespesaLocal = useCallback((despesa: any) => setDespesas(prev => [...prev, despesa]), [])
  const addProfissionalLocal = useCallback((profissional: any) => setProfissionais(prev => [...prev, profissional]), [])
  const removeProfissionalLocal = useCallback((id: number) => setProfissionais(prev => prev.filter(p => p.id !== id)), [])
  const updateProfissionalLocal = useCallback((id: number, updates: any) => setProfissionais(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)), [])

  // ============ GET VENDAS ============
  const getVendas = useCallback(async (ano: number, meses: number[]): Promise<any[]> => {
    const sortedMeses = [...meses].sort((a, b) => a - b)
    const cacheKey = `${ano}-${sortedMeses.join(',')}`
    const cached = vendasCacheRef.current.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Vendas do cache (${cacheKey})`)
      return cached.data
    }
    
    console.log(`🔍 Buscando vendas (${cacheKey})`)
    const vendas = await supabaseApi.getVendas(ano, sortedMeses)
    vendasCacheRef.current.set(cacheKey, { data: vendas || [], timestamp: Date.now() })
    return vendas || []
  }, [])

  const clearVendasCache = useCallback(() => {
    vendasCacheRef.current.clear()
    vendasPorDiaCacheRef.current.clear()
    vendasPorCategoriaCacheRef.current.clear()
  }, [])

  const invalidateCache = useCallback(() => {
    isInitializedRef.current = false
    lastLoadTimestamp.current = 0
    vendasCacheRef.current.clear()
    vendasPorDiaCacheRef.current.clear()
    vendasPorCategoriaCacheRef.current.clear()
    resumoMensalCacheRef.current.clear()
    resumosDiariosCacheRef.current.clear()
    resumosSemanaisCacheRef.current.clear()
    resumoEspecificoCacheRef.current.clear()
  }, [])

  // ============ GET VENDAS POR DIA ============
  const getVendasPorDia = useCallback(async (ano: number, mes: number): Promise<Record<number, number>> => {
    const cacheKey = `${ano}-${mes}`
    const cached = vendasPorDiaCacheRef.current.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    const data = await supabaseApi.getVendasPorDia(ano, mes)
    vendasPorDiaCacheRef.current.set(cacheKey, { data: data || {}, timestamp: Date.now() })
    return data || {}
  }, [])

  // ============ GET VENDAS POR CATEGORIA ============
  const getVendasPorCategoria = useCallback(async (ano: number, meses: number[]) => {
    const sortedMeses = [...meses].sort((a, b) => a - b)
    const cacheKey = `${ano}-${sortedMeses.join(',')}`
    const cached = vendasPorCategoriaCacheRef.current.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    const data = await supabaseApi.getVendasPorCategoria(ano, sortedMeses)
    vendasPorCategoriaCacheRef.current.set(cacheKey, { data: data || { toxina: 0, preenchedor: 0, biotech: 0, total: 0 }, timestamp: Date.now() })
    return data || { toxina: 0, preenchedor: 0, biotech: 0, total: 0 }
  }, [])

  // ============ GET RESUMO INDICADORES MENSAL ============
  const getResumoIndicadoresMensal = useCallback(async (mesAno: string) => {
    const cached = resumoMensalCacheRef.current.get(mesAno)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    const clinicId = supabaseApi.getCurrentClinicId()
    if (!clinicId) return null
    
    try {
      const { data, error } = await supabaseApi.supabase
        .from('resumo_indicadores_mensal')
        .select('*')
        .eq('id_clinica', clinicId)
        .eq('mes_ano', mesAno)
        .order('data_geracao', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      const result = data && data.length > 0 ? data[0] : null
      resumoMensalCacheRef.current.set(mesAno, { data: result, timestamp: Date.now() })
      return result
    } catch (error) {
      console.error('❌ Erro ao buscar resumo mensal:', error)
      return null
    }
  }, [])

  // ============ GET ANOS DISPONÍVEIS ============
  const getAnosDisponiveis = useCallback(async (): Promise<string[]> => {
    const clinicId = supabaseApi.getCurrentClinicId()
    if (!clinicId) return []
    
    try {
      const { data, error } = await supabaseApi.supabase
        .from('resumo_indicadores_mensal')
        .select('mes_ano')
        .eq('id_clinica', clinicId)
        .order('mes_ano', { ascending: false })
      
      if (error) throw error
      
      const anos = Array.from(new Set(data?.map(r => r.mes_ano.split('-')[0]) || []))
        .sort((a, b) => b.localeCompare(a))
      
      return anos
    } catch (error) {
      console.error('❌ Erro ao buscar anos:', error)
      return []
    }
  }, [])

  // ============ GET RESUMOS DIÁRIOS PACIENTE ============
  const getResumosDiariosPaciente = useCallback(async (cpf: string): Promise<any[]> => {
    const cached = resumosDiariosCacheRef.current.get(cpf)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    const data = await supabaseApi.getResumosDiariosPaciente(cpf)
    resumosDiariosCacheRef.current.set(cpf, { data: data || [], timestamp: Date.now() })
    return data || []
  }, [])

  // ============ GET RESUMOS SEMANAIS PACIENTE ============
  const getResumosSemanaisPaciente = useCallback(async (cpf: string): Promise<any[]> => {
    const cached = resumosSemanaisCacheRef.current.get(cpf)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    const clinicId = supabaseApi.getCurrentClinicId()
    if (!clinicId) return []
    
    try {
      const { data, error } = await supabaseApi.supabase
        .from('resumos_semanais_paciente')
        .select('*')
        .eq('cpf', cpf)
        .eq('id_clinica', clinicId)
        .order('data_inicio_semana', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao buscar resumos semanais:', error)
        return []
      }
      
      resumosSemanaisCacheRef.current.set(cpf, { data: data || [], timestamp: Date.now() })
      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar resumos semanais:', error)
      return []
    }
  }, [])

  // ============ GET RESUMO ESPECÍFICO ============
  const getResumoEspecifico = useCallback(async (cpf: string, dataResumo: string) => {
    const cacheKey = `${cpf}-${dataResumo}`
    const cached = resumoEspecificoCacheRef.current.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    const data = await supabaseApi.getResumoEspecifico(cpf, dataResumo)
    resumoEspecificoCacheRef.current.set(cacheKey, { data, timestamp: Date.now() })
    return data
  }, [])

  // ============ GET PACIENTES COM RESUMOS (DIÁRIOS OU SEMANAIS) ============
  const getPacientesComResumos = useCallback(async (): Promise<any[]> => {
    const clinicId = supabaseApi.getCurrentClinicId()
    if (!clinicId) return []
    
    try {
      // Buscar CPFs únicos que têm resumos diários
      const { data: cpfsDiarios, error: errDiarios } = await supabaseApi.supabase
        .from('resumos_diarios_paciente')
        .select('cpf')
        .eq('id_clinica', clinicId)
      
      if (errDiarios) {
        console.error('❌ Erro ao buscar CPFs diários:', errDiarios)
      }
      
      // Buscar CPFs únicos que têm resumos semanais
      const { data: cpfsSemanais, error: errSemanais } = await supabaseApi.supabase
        .from('resumos_semanais_paciente')
        .select('cpf')
        .eq('id_clinica', clinicId)
      
      if (errSemanais) {
        console.error('❌ Erro ao buscar CPFs semanais:', errSemanais)
      }
      
      // Combinar CPFs únicos
      const cpfsComResumo = new Set<string>()
      cpfsDiarios?.forEach(r => cpfsComResumo.add(r.cpf))
      cpfsSemanais?.forEach(r => cpfsComResumo.add(r.cpf))
      
      if (cpfsComResumo.size === 0) {
        console.log('⚠️ Nenhum paciente com resumo encontrado')
        return []
      }
      
      // Buscar dados completos dos pacientes que têm resumos
      const { data: pacientesData, error: errPacientes } = await supabaseApi.supabase
        .from('pacientes')
        .select('id_paciente, nome_completo, cpf, data_nascimento, celular')
        .eq('id_clinica', clinicId)
        .in('cpf', Array.from(cpfsComResumo))
        .order('nome_completo', { ascending: true })
      
      if (errPacientes) {
        console.error('❌ Erro ao buscar pacientes com resumos:', errPacientes)
        return []
      }
      
      console.log(`✅ Pacientes com resumos: ${pacientesData?.length || 0}`)
      return pacientesData || []
    } catch (error) {
      console.error('❌ Erro getPacientesComResumos:', error)
      return []
    }
  }, [])

  return (
    <DataContext.Provider value={{
      servicos, despesas, profissionais, parametros, skus, produtosComLotes, pacientes,
      loading, initialized,
      loadAllData, refreshData, invalidateCache,
      updateParametrosLocal, addDespesaLocal, addProfissionalLocal, removeProfissionalLocal, updateProfissionalLocal,
      getVendas, clearVendasCache,
      getVendasPorDia, getVendasPorCategoria,
      getResumoIndicadoresMensal, getAnosDisponiveis,
      getResumosDiariosPaciente, getResumosSemanaisPaciente, getResumoEspecifico, getPacientesComResumos
    }}>
      {children}
    </DataContext.Provider>
  )
}

// ============ HOOK PRINCIPAL ============
export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData deve ser usado dentro de um DataProvider')
  }
  return context
}

// ============ HOOK PARA VENDAS COM DEBOUNCE ============
export function useVendas(ano: number, meses: number[]) {
  const { getVendas, initialized } = useData()
  const [vendas, setVendas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedKeyRef = useRef<string>('')
  const lastFetchedTimestampRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => { 
      isMountedRef.current = false 
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [])

  const fetchVendas = useCallback(async (force = false) => {
    if (!isMountedRef.current || !initialized) return

    const sortedMeses = [...meses].sort((a, b) => a - b)
    const periodKey = `${ano}-${sortedMeses.join(',')}`
    const now = Date.now()
    const CACHE_TTL = 5 * 60 * 1000
    
    const cacheExpired = (now - lastFetchedTimestampRef.current) > CACHE_TTL
    const keyChanged = periodKey !== lastFetchedKeyRef.current
    
    if (!force && !keyChanged && !cacheExpired) return

    setLoading(true)
    try {
      console.log(`🔄 useVendas: ${keyChanged ? 'key mudou' : cacheExpired ? 'cache expirou' : 'force'}`)
      const data = await getVendas(ano, sortedMeses)
      if (isMountedRef.current) {
        setVendas(data)
        lastFetchedKeyRef.current = periodKey
        lastFetchedTimestampRef.current = now
      }
    } catch (error) {
      console.error('❌ useVendas:', error)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [ano, meses, getVendas, initialized])

  useEffect(() => {
    if (!initialized) return
    
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => fetchVendas(), 300)

    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    refreshIntervalRef.current = setInterval(() => fetchVendas(), 60 * 1000)

    return () => { 
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [ano, meses.join(','), initialized, fetchVendas])

  const reload = useCallback(() => {
    lastFetchedKeyRef.current = ''
    lastFetchedTimestampRef.current = 0
    fetchVendas(true)
  }, [fetchVendas])

  return { vendas, loading, reload }
}

// ============ HOOK PARA VENDAS POR DIA ============
export function useVendasPorDia(ano: number, mes: number) {
  const { getVendasPorDia, initialized } = useData()
  const [vendasPorDia, setVendasPorDia] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedKeyRef = useRef<string>('')
  const lastFetchedTimestampRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => { 
      isMountedRef.current = false 
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [])

  const fetchData = useCallback(async (force = false) => {
    if (!isMountedRef.current || !initialized) return

    const periodKey = `${ano}-${mes}`
    const now = Date.now()
    const CACHE_TTL = 5 * 60 * 1000
    
    const cacheExpired = (now - lastFetchedTimestampRef.current) > CACHE_TTL
    const keyChanged = periodKey !== lastFetchedKeyRef.current
    
    if (!force && !keyChanged && !cacheExpired) return

    setLoading(true)
    try {
      const data = await getVendasPorDia(ano, mes)
      if (isMountedRef.current) {
        setVendasPorDia(data)
        lastFetchedKeyRef.current = periodKey
        lastFetchedTimestampRef.current = now
      }
    } catch (error) {
      console.error('❌ useVendasPorDia:', error)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [ano, mes, getVendasPorDia, initialized])

  useEffect(() => {
    if (!initialized) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => fetchData(), 300)

    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    refreshIntervalRef.current = setInterval(() => fetchData(), 60 * 1000)

    return () => { 
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [ano, mes, initialized, fetchData])

  return { vendasPorDia, loading }
}

// ============ HOOK PARA VENDAS POR CATEGORIA ============
export function useVendasPorCategoria(ano: number, meses: number[]) {
  const { getVendasPorCategoria, initialized } = useData()
  const [vendasPorCategoria, setVendasPorCategoria] = useState({ toxina: 0, preenchedor: 0, biotech: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedKeyRef = useRef<string>('')
  const lastFetchedTimestampRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => { 
      isMountedRef.current = false 
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [])

  const fetchData = useCallback(async (force = false) => {
    if (!isMountedRef.current || !initialized) return

    const sortedMeses = [...meses].sort((a, b) => a - b)
    const periodKey = `${ano}-${sortedMeses.join(',')}`
    const now = Date.now()
    const CACHE_TTL = 5 * 60 * 1000
    
    const cacheExpired = (now - lastFetchedTimestampRef.current) > CACHE_TTL
    const keyChanged = periodKey !== lastFetchedKeyRef.current
    
    if (!force && !keyChanged && !cacheExpired) return

    setLoading(true)
    try {
      const data = await getVendasPorCategoria(ano, sortedMeses)
      if (isMountedRef.current) {
        setVendasPorCategoria(data)
        lastFetchedKeyRef.current = periodKey
        lastFetchedTimestampRef.current = now
      }
    } catch (error) {
      console.error('❌ useVendasPorCategoria:', error)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [ano, meses, getVendasPorCategoria, initialized])

  useEffect(() => {
    if (!initialized) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => fetchData(), 300)

    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    refreshIntervalRef.current = setInterval(() => fetchData(), 60 * 1000)

    return () => { 
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [ano, meses.join(','), initialized, fetchData])

  return { vendasPorCategoria, loading }
}

// ============ HOOK PARA RESUMOS DE PACIENTE ============
export function useResumosPaciente(cpf: string | null) {
  const { getResumosDiariosPaciente, getResumosSemanaisPaciente, initialized } = useData()
  const [resumosDiarios, setResumosDiarios] = useState<any[]>([])
  const [resumosSemanais, setResumosSemanais] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const lastCpfRef = useRef<string>('')
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!initialized || !cpf) {
      setResumosDiarios([])
      setResumosSemanais([])
      return
    }

    if (cpf === lastCpfRef.current) return

    const loadResumos = async () => {
      setLoading(true)
      try {
        const [diarios, semanais] = await Promise.all([
          getResumosDiariosPaciente(cpf),
          getResumosSemanaisPaciente(cpf)
        ])
        
        if (isMountedRef.current) {
          setResumosDiarios(diarios)
          setResumosSemanais(semanais)
          lastCpfRef.current = cpf
        }
      } catch (error) {
        console.error('❌ useResumosPaciente:', error)
      } finally {
        if (isMountedRef.current) setLoading(false)
      }
    }

    loadResumos()
  }, [cpf, getResumosDiariosPaciente, getResumosSemanaisPaciente, initialized])

  return { resumosDiarios, resumosSemanais, loading }
}