'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Sparkles, Heart, Flower, Lock, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface LoginForm {
  username: string
  password: string
}

// Componente de partículas flutuantes para efeito estético com cores da marca
const FloatingParticle = ({ delay = 0, duration = 20 }: { delay?: number; duration?: number }) => {
  return (
    <div 
      className="absolute opacity-15 animate-pulse"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      }}
    >
      <div className="w-1.5 h-1.5 bg-clinic-cyan/60 rounded-full blur-sm"></div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Animação de entrada
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)
    
    try {
      const user = await supabaseApi.authenticateUser(loginForm.username, loginForm.password)
      
      // Salvar usuário no localStorage para sessão
      localStorage.setItem('ballarin_user', JSON.stringify(user))
      
      // Admin tem acesso a tudo, redireciona para dashboard
      // Staff vai para estoque
      if (user.role === 'admin') {
        router.replace('/dashboard')
      } else {
        router.replace('/estoque')
      }
    } catch (error) {
      setLoginError('Usuário ou senha incorreta. Tente novamente.')
      console.error('Erro na autenticação:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Principal com Gradientes Premium */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      
      {/* Overlay de gradientes estéticos */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-blue-500/10"></div>
        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-gradient-to-bl from-rose-300/10 via-transparent to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-gradient-to-tr from-violet-300/10 via-transparent to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Partículas Flutuantes */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }, (_, i) => (
          <FloatingParticle key={i} delay={i * 0.5} duration={15 + Math.random() * 10} />
        ))}
      </div>

      {/* Elementos Decorativos Estéticos */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Círculos decorativos */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-pink-400/10 to-purple-400/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-20 w-24 h-24 bg-gradient-to-r from-blue-400/10 to-teal-400/10 rounded-full blur-lg animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-20 w-20 h-20 bg-gradient-to-r from-rose-400/10 to-pink-400/10 rounded-full blur-lg animate-pulse" style={{animationDelay: '4s'}}></div>
        
        {/* Ícones flutuantes de estética */}
        <div className="absolute top-1/4 left-1/4 opacity-5 animate-bounce" style={{animationDelay: '1s', animationDuration: '3s'}}>
          <Sparkles className="w-8 h-8 text-pink-300" />
        </div>
        <div className="absolute top-3/4 right-1/3 opacity-5 animate-bounce" style={{animationDelay: '3s', animationDuration: '4s'}}>
          <Heart className="w-6 h-6 text-rose-300" />
        </div>
        <div className="absolute top-1/2 right-1/4 opacity-5 animate-bounce" style={{animationDelay: '5s', animationDuration: '3.5s'}}>
          <Flower className="w-7 h-7 text-purple-300" />
        </div>
      </div>

      {/* Container Principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className={`w-full max-w-md transition-all duration-1000 transform ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          
          {/* Card Principal */}
          <div className="bg-clinic-gray-800/30 backdrop-blur-xl rounded-3xl p-8 border border-clinic-cyan/10 shadow-2xl">
            
            {/* Logo e Branding */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-6">
                <Image
                  src="/justiconecta.png"
                  alt="JustiConecta"
                  width={80}
                  height={80}
                  className="rounded-2xl shadow-lg"
                />
              </div>
              
              <h1 className="text-3xl font-bold bg-gradient-to-r from-clinic-white via-clinic-cyan/80 to-clinic-cyan bg-clip-text text-transparent mb-2">
                Clínica Ballarin
              </h1>
              <p className="text-clinic-gray-300 text-sm font-light tracking-wide">
                Sistema Premium de Gestão Estética
              </p>
              
              {/* Linha decorativa */}
              <div className="flex items-center justify-center mt-4 mb-6">
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-clinic-cyan/50 to-transparent"></div>
                <Sparkles className="w-4 h-4 text-clinic-cyan/70 mx-3" />
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-clinic-cyan/50 to-transparent"></div>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Campo Usuário */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-clinic-gray-300 block">
                  Usuário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Digite seu usuário"
                    className="w-full px-4 py-3 bg-clinic-gray-700/30 border border-clinic-gray-600/50 rounded-xl text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:ring-2 focus:ring-clinic-cyan/50 focus:border-clinic-cyan/50 transition-all duration-200 backdrop-blur-sm"
                    required
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-clinic-gray-300 block">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Digite sua senha"
                    className="w-full px-4 py-3 pr-12 bg-clinic-gray-700/30 border border-clinic-gray-600/50 rounded-xl text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:ring-2 focus:ring-clinic-cyan/50 focus:border-clinic-cyan/50 transition-all duration-200 backdrop-blur-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-clinic-gray-400 hover:text-clinic-cyan transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Erro de Login */}
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-400/20 rounded-xl text-red-300 text-sm text-center backdrop-blur-sm">
                  {loginError}
                </div>
              )}

              {/* Botão de Login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-clinic-cyan to-clinic-cyan-dark hover:from-clinic-cyan/90 hover:to-clinic-cyan-dark/90 text-clinic-black font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-clinic-cyan/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 backdrop-blur-sm"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-clinic-black/30 border-t-clinic-black rounded-full animate-spin"></div>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Acessar Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              {/* Indicadores de segurança */}
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-clinic-cyan rounded-full animate-pulse"></div>
                  <span className="text-xs text-clinic-gray-400">Conectado</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-clinic-gray-400" />
                  <span className="text-xs text-clinic-gray-400">Criptografado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Efeitos adicionais embaixo do card */}
          <div className="relative">
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-3/4 h-6 bg-gradient-to-r from-transparent via-clinic-cyan/10 to-transparent blur-xl"></div>
          </div>
        </div>
      </div>

      {/* Overlay de brilho sutil com cores da marca */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-clinic-cyan/5 pointer-events-none"></div>
      
      {/* CSS Customizado para Animações */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          33% { transform: rotate(5deg); }
          66% { transform: rotate(-5deg); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}