// hooks/useModalDataCache.ts
// Cache simples para dados do NovaVendaModal - evita recarregar a cada abertura

import { useState, useCallback, useRef } from 'react'
import { supabaseApi } from '@/lib/supabase'
import { Paciente, Lote, Sku, Profissional } from '@/types/database'

interface CachedData {
  pacientes: Paciente[]
  lotesDisponiveis: (Lote & { skus: Sku })[]
  profissionais: Profissional[]
  lastFetchTime: number
}

// Cache TTL: 5 minutos (dados podem mudar, mas não tão frequentemente)
const CACHE_TTL_MS = 5 * 60 * 1000

// Cache global (persiste entre aberturas do modal)
let globalCache: CachedData | null = null

/**
 * Hook que gerencia cache dos dados do modal de venda
 * Só recarrega se:
 * - Cache está vazio
 * - Cache expirou (> 5 min)
 * - forceRefresh = true
 */
export function useModalDataCache() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Omit<CachedData, 'lastFetchTime'>>({
    pacientes: [],
    lotesDisponiveis: [],
    profissionais: []
  })

  const isCacheValid = useCallback(() => {
    if (!globalCache) return false
    const now = Date.now()
    return (now - globalCache.lastFetchTime) < CACHE_TTL_MS
  }, [])

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    // Se cache válido e não forçou refresh, usa cache
    if (!forceRefresh && isCacheValid() && globalCache) {
      console.log('📦 Usando cache do modal (TTL válido)')
      setData({
        pacientes: globalCache.pacientes,
        lotesDisponiveis: globalCache.lotesDisponiveis,
        profissionais: globalCache.profissionais
      })
      return
    }

    // Caso contrário, busca dados frescos
    console.log('🔄 Carregando dados frescos para modal...')
    setLoading(true)

    try {
      const [pacientesData, produtosData, profissionaisData] = await Promise.all([
        supabaseApi.getPacientes(),
        supabaseApi.getProdutos(),
        supabaseApi.getProfissionais()
      ])

      // Processar lotes
      const lotes: (Lote & { skus: Sku })[] = []
      produtosData.forEach((prod: any) => {
        if (prod.lotes && prod.lotes.length > 0) {
          prod.lotes.forEach((lote: Lote) => {
            lotes.push({ ...lote, skus: prod })
          })
        }
      })

      // Atualizar cache global
      globalCache = {
        pacientes: pacientesData,
        lotesDisponiveis: lotes,
        profissionais: profissionaisData,
        lastFetchTime: Date.now()
      }

      // Atualizar estado local
      setData({
        pacientes: pacientesData,
        lotesDisponiveis: lotes,
        profissionais: profissionaisData
      })

      console.log(`✅ Cache atualizado: ${pacientesData.length} pacientes, ${lotes.length} lotes, ${profissionaisData.length} profissionais`)
    } catch (error) {
      console.error('Erro ao carregar dados do modal:', error)
    } finally {
      setLoading(false)
    }
  }, [isCacheValid])

  // Invalida cache (chamar após criar venda para forçar refresh na próxima abertura)
  const invalidateCache = useCallback(() => {
    console.log('🗑️ Cache do modal invalidado')
    globalCache = null
  }, [])

  // Força refresh do cache
  const refreshCache = useCallback(() => {
    loadData(true)
  }, [loadData])

  return {
    ...data,
    loading,
    loadData,
    invalidateCache,
    refreshCache,
    isCacheValid
  }
}

/**
 * Função utilitária para invalidar cache de fora do hook
 * Útil para chamar após operações que alteram dados (ex: criar paciente)
 */
export function invalidateModalCache() {
  globalCache = null
  console.log('🗑️ Cache do modal invalidado externamente')
}

export default useModalDataCache