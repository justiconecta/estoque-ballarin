// hooks/useDebounce.ts
// Hook para debounce de valores - evita múltiplas queries ao mudar filtros rapidamente

import { useState, useEffect } from 'react'

/**
 * Hook que retorna um valor "debounced" - só atualiza após o delay especificado
 * Útil para evitar múltiplas chamadas de API ao digitar ou mudar filtros
 * 
 * @param value - Valor a ser debounced
 * @param delay - Tempo em ms para aguardar antes de atualizar (default: 300ms)
 * @returns Valor debounced
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 500)
 * 
 * useEffect(() => {
 *   // Só executa quando usuário para de digitar por 500ms
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: cancela o timeout se o valor mudar antes do delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook para debounce de callbacks/funções
 * Útil para evitar múltiplas execuções de funções caras
 * 
 * @param callback - Função a ser debounced
 * @param delay - Tempo em ms para aguardar (default: 300ms)
 * @returns Função debounced
 * 
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToServer(data)
 * }, 1000)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(newTimeoutId)
  }
}

export default useDebounce