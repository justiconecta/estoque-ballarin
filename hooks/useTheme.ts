'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light'

interface ThemeConfig {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
  isLight: boolean
}

/**
 * Hook customizado para gerenciamento de temas
 * Sincroniza com localStorage e aplica no documento
 */
export function useTheme(): ThemeConfig {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [isInitialized, setIsInitialized] = useState(false)

  // Inicializar tema do localStorage ou preferência do sistema
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeTheme = () => {
      // Primeiro verificar localStorage
      const savedTheme = localStorage.getItem('ballarin_theme') as Theme | null
      
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      } else {
        // Se não há tema salvo, usar preferência do sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const systemTheme: Theme = prefersDark ? 'dark' : 'light'
        setThemeState(systemTheme)
        applyTheme(systemTheme)
        localStorage.setItem('ballarin_theme', systemTheme)
      }
      
      setIsInitialized(true)
    }

    initializeTheme()
  }, [])

  // Aplicar tema no documento
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    
    // Remover tema anterior
    root.removeAttribute('data-theme')
    root.classList.remove('dark', 'light')
    
    // Aplicar novo tema
    root.setAttribute('data-theme', newTheme)
    root.classList.add(newTheme)
    
    // Aplicar meta theme-color para mobile
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }
    
    // Cores para meta theme-color baseadas no tema
    const themeColors = {
      dark: '#000000',
      light: '#ffffff'
    }
    
    metaThemeColor.setAttribute('content', themeColors[newTheme])
  }, [])

  // Função para alternar tema
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('ballarin_theme', newTheme)
  }, [theme, applyTheme])

  // Função para definir tema específico
  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === theme) return
    
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('ballarin_theme', newTheme)
  }, [theme, applyTheme])

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Só aplicar tema do sistema se não há preferência salva pelo usuário
      const hasUserPreference = localStorage.getItem('ballarin_theme')
      if (!hasUserPreference) {
        const systemTheme: Theme = e.matches ? 'dark' : 'light'
        setThemeState(systemTheme)
        applyTheme(systemTheme)
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [isInitialized, applyTheme])

  return {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  }
}