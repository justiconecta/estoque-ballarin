'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ============================================
// TIPOS
// ============================================

interface UserProfile {
  id_usuario: number
  usuario: string
  nome_completo: string | null
  email: string | null
  role: string
  id_clinica: number
  ativo: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

// ============================================
// CONTEXTO
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================
// HELPER: Limpar localStorage
// ============================================

function clearLocalStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clinic_id')
    localStorage.removeItem('clinic_info')
    localStorage.removeItem('ballarin_user')
    console.log('🧹 LocalStorage limpo')
  }
}

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const isLoggingOut = useRef(false)
  const initCompleted = useRef(false) // ✅ Flag para controlar quando init terminou

  // Carregar perfil do usuário
  const loadProfile = async (userId: string): Promise<UserProfile | null> => {
    if (isLoggingOut.current) {
      console.log('⏭️ Ignorando loadProfile - logout em andamento')
      return null
    }

    try {
      console.log('🔍 Buscando perfil para auth_id:', userId)
      
      const { data, error } = await supabase
        .from('usuarios_internos')
        .select('id_usuario, usuario, nome_completo, email, role, id_clinica, ativo')
        .eq('auth_id', userId)
        .single()

      if (error) {
        console.error('❌ Erro ao carregar perfil:', error)
        return null
      }

      // Salvar no localStorage para compatibilidade com supabaseApi
      if (data && typeof window !== 'undefined') {
        localStorage.setItem('clinic_id', data.id_clinica.toString())
        localStorage.setItem('ballarin_user', JSON.stringify(data))
        console.log(`✅ Perfil carregado: ${data.nome_completo} (Clínica ${data.id_clinica})`)
      }

      return data as UserProfile
    } catch (error) {
      console.error('❌ Erro ao carregar perfil:', error)
      return null
    }
  }

  // Inicializar autenticação
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      if (isLoggingOut.current) return

      try {
        console.log('🚀 Iniciando verificação de sessão...')
        
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!mounted || isLoggingOut.current) return

        if (currentSession?.user) {
          console.log('✅ Sessão Supabase Auth encontrada, carregando perfil...')
          setSession(currentSession)
          setUser(currentSession.user)
          
          const userProfile = await loadProfile(currentSession.user.id)
          
          if (mounted && !isLoggingOut.current) {
            setProfile(userProfile)
            
            if (!userProfile) {
              console.log('⚠️ Perfil não encontrado no banco, limpando sessão...')
              clearLocalStorage()
            }
          }
        } else {
          console.log('❌ Sem sessão Supabase Auth ativa')
          // NÃO limpar localStorage aqui - pode ter login antigo válido
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar auth:', error)
      } finally {
        if (mounted && !isLoggingOut.current) {
          initCompleted.current = true
          setLoading(false)
          console.log('✅ Auth init COMPLETO - loading = false')
        }
      }
    }

    initAuth()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        
        console.log('🔔 Auth event:', event, '| isLoggingOut:', isLoggingOut.current, '| initCompleted:', initCompleted.current)
        
        // Se está fazendo logout, ignorar todos os eventos
        if (isLoggingOut.current) {
          console.log('⏭️ Ignorando evento - logout em andamento')
          return
        }

        // ✅ SIGNED_OUT: Limpar tudo
        if (event === 'SIGNED_OUT') {
          console.log('🚪 SIGNED_OUT detectado - limpando estado')
          setSession(null)
          setUser(null)
          setProfile(null)
          clearLocalStorage()
          // Só setar loading=false se init já completou
          if (initCompleted.current) {
            setLoading(false)
          }
          return
        }

        // ✅ INITIAL_SESSION: NÃO fazer nada aqui - deixar initAuth controlar
        if (event === 'INITIAL_SESSION') {
          console.log('⏭️ INITIAL_SESSION - ignorando (initAuth controla)')
          return
        }

        // ✅ SIGNED_IN: Carregar perfil (só se init já completou - caso de re-login)
        if (event === 'SIGNED_IN' && newSession?.user && initCompleted.current) {
          console.log('🔄 SIGNED_IN detectado após init, recarregando perfil...')
          setSession(newSession)
          setUser(newSession.user)
          const userProfile = await loadProfile(newSession.user.id)
          if (mounted && !isLoggingOut.current) {
            setProfile(userProfile)
          }
        }

        // ✅ TOKEN_REFRESHED: Apenas atualizar sessão
        if (event === 'TOKEN_REFRESHED' && newSession) {
          console.log('🔄 Token refreshed')
          setSession(newSession)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Login
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
        return { error }
      }

      if (data.user) {
        const userProfile = await loadProfile(data.user.id)
        
        if (!userProfile) {
          await supabase.auth.signOut()
          setLoading(false)
          return { error: new Error('Usuário não encontrado no sistema') }
        }

        if (!userProfile.ativo) {
          await supabase.auth.signOut()
          setLoading(false)
          return { error: new Error('Usuário desativado') }
        }

        setSession(data.session)
        setUser(data.user)
        setProfile(userProfile)

        // Atualizar último login
        await supabase
          .from('usuarios_internos')
          .update({ ultimo_login: new Date().toISOString() })
          .eq('auth_id', data.user.id)
      }

      setLoading(false)
      return { error: null }
    } catch (error) {
      setLoading(false)
      return { error: error as Error }
    }
  }

  // Logout
  const signOut = async () => {
    // Ativar flag IMEDIATAMENTE para bloquear eventos
    isLoggingOut.current = true
    console.log('🚪 Iniciando logout...')

    // Limpar estado local primeiro
    setUser(null)
    setSession(null)
    setProfile(null)
    clearLocalStorage()

    // Redirecionar ANTES do signOut do Supabase
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }

    // SignOut do Supabase em background (não aguardar)
    supabase.auth.signOut().catch(err => {
      console.error('Erro no signOut:', err)
    })
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!profile?.ativo,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

// ============================================
// HOC PARA PROTEÇÃO DE ROTAS
// ============================================

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return null
    }

    return <WrappedComponent {...props} />
  }
}