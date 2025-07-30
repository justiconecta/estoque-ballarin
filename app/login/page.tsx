'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  Heart, 
  Star, 
  Droplet,
  Zap,
  Crown,
  Activity,
  Plus
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface LoginForm {
  username: string
  password: string
}

// Ícones estéticos médicos para animação de fundo
const aestheticIcons = [
  Droplet,    // Ampola/soro
  Plus,       // Cruz médica
  Activity,   // Batimento/saúde
  Heart,      // Coração/bem-estar
  Sparkles,   // Resultado estético
  Star,       // Avaliação/qualidade
  Zap,        // Energia/tratamento
  Crown       // Premium/excelência
]

// Componente customizado para ícone de seringa
const SyringeIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12h16M12 4v16M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.3"/>
  </svg>
)

// Componente customizado para ícone de ampola
const AmpouleIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 2h8v4l-2 2v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V8l-2-2V2z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.2"/>
    <path d="M8 6h8M10 10h4M10 14h4" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
  </svg>
)

// Array expandido com ícones médicos customizados
const medicalAestheticIcons = [
  ...aestheticIcons,
  SyringeIcon,   // Seringa customizada
  AmpouleIcon    // Ampola customizada
]

// Componente de ícone flutuante para efeito estético premium - mais visível
const FloatingAestheticIcon = ({ 
  delay = 0, 
  duration = 15, 
  IconComponent = Sparkles,
  size = 16 
}: { 
  delay?: number
  duration?: number
  IconComponent?: any
  size?: number
}) => {
  const [position] = useState({
    left: Math.random() * 100,
    top: Math.random() * 100,
    rotation: Math.random() * 360
  })

  return (
    <div 
      className="absolute opacity-40 animate-float"
      style={{
        left: `${position.left}%`,
        top: `${position.top}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        transform: `rotate(${position.rotation}deg)`
      }}
    >
      <IconComponent 
        size={size} 
        className="text-[#12f6ff] drop-shadow-lg filter blur-[0.2px]" 
      />
    </div>
  )
}

// Componente de partícula cintilante mais sutil
const SparkleParticle = ({ delay = 0 }: { delay?: number }) => {
  return (
    <div 
      className="absolute opacity-25 animate-pulse"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + Math.random() * 2}s`
      }}
    >
      <div className="w-1 h-1 bg-[#12f6ff] rounded-full shadow-[0_0_4px_#12f6ff]"></div>
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

  // Animação de entrada suave
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      
      {/* Background com ícones estéticos flutuantes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradiente de fundo mais sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#12f6ff]/3 via-transparent to-[#03c8d9]/3"></div>
        
        {/* Ícones estéticos médicos flutuantes - múltiplas camadas mais visíveis */}
        {Array.from({ length: 30 }, (_, i) => (
          <FloatingAestheticIcon
            key={`aesthetic-${i}`}
            delay={i * 0.6}
            duration={10 + (i % 6)}
            IconComponent={medicalAestheticIcons[i % medicalAestheticIcons.length]}
            size={14 + (i % 4) * 3}
          />
        ))}
        
        {/* Partículas cintilantes menores */}
        {Array.from({ length: 20 }, (_, i) => (
          <SparkleParticle key={`sparkle-${i}`} delay={i * 0.5} />
        ))}
      </div>

      {/* Container principal centralizado */}
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <div className={`
          w-full max-w-md transition-all duration-1000 ease-out transform
          ${isLoaded ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}
        `}>
          
          {/* Card Principal com efeito de vidro */}
          <div 
            className="relative rounded-3xl p-8 border shadow-2xl backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderColor: 'rgba(18, 246, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(18, 246, 255, 0.15), 0 0 0 1px rgba(18, 246, 255, 0.1)'
            }}
          >
            
            {/* Brilho sutil no topo do card */}
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-1 rounded-full opacity-60"
              style={{ backgroundColor: '#12f6ff', filter: 'blur(1px)' }}
            ></div>
            
            {/* Logo e Branding */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-1">
                <Image
                  src="/justiconecta.png"
                  alt="Clínica Ballarin"
                  width={120}
                  height={120}
                  className="rounded-2xl shadow-lg"
                />
              </div>
              
              <h1 
                className="text-3xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: `linear-gradient(135deg, #ffffff 0%, #12f6ff 50%, #03c8d9 100%)` 
                }}
              >
                Método 545
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }} className="text-sm font-light tracking-wide">
                Sistema Premium de Gestão de Clínicas
              </p>
              
              {/* Linha decorativa estética */}
              <div className="flex items-center justify-center mt-6 mb-8">
                <div 
                  className="w-16 h-px opacity-50"
                  style={{ backgroundColor: '#12f6ff' }}
                ></div>
                <div className="mx-4 p-2 rounded-full" style={{ backgroundColor: 'rgba(18, 246, 255, 0.1)' }}>
                  <Plus className="w-4 h-4" style={{ color: '#12f6ff' }} />
                </div>
                <div 
                  className="w-16 h-px opacity-50"
                  style={{ backgroundColor: '#12f6ff' }}
                ></div>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Campo Usuário */}
              <div className="space-y-2">
                <label 
                  className="text-sm font-medium block"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  Usuário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Digite seu usuário"
                    className="w-full px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 backdrop-blur-sm"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderWidth: '1px',
                      borderColor: 'rgba(18, 246, 255, 0.3)',
                      color: '#ffffff',                      
                    }}
                    required
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <label 
                  className="text-sm font-medium block"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Digite sua senha"
                    className="w-full px-4 py-3 pr-12 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 backdrop-blur-sm"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderWidth: '1px',
                      borderColor: 'rgba(18, 246, 255, 0.3)',
                      color: '#ffffff'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Erro de Login */}
              {loginError && (
                <div 
                  className="p-3 rounded-xl text-sm text-center backdrop-blur-sm border"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5'
                  }}
                >
                  {loginError}
                </div>
              )}

              {/* Botão de Login Premium */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 backdrop-blur-sm relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, #12f6ff 0%, #03c8d9 100%)`,
                  color: '#000000',
                  boxShadow: '0 10px 25px -5px rgba(18, 246, 255, 0.3), 0 0 0 1px rgba(18, 246, 255, 0.1)'
                }}
              >
                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    <span>Acessar Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer estético */}
            <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'rgba(18, 246, 255, 0.1)' }}>
              <div className="flex items-center justify-center space-x-2">
                <Heart className="w-4 h-4" style={{ color: '#12f6ff' }} />
                <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Todos os direitos reservados a Justiconecta
                </p>
                <Heart className="w-4 h-4" style={{ color: '#12f6ff' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adição de estilos CSS personalizados */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(5deg); }
          50% { transform: translateY(-5px) rotate(-5deg); }
          75% { transform: translateY(-15px) rotate(3deg); }
        }
        
        .animate-float {
          animation: float 15s ease-in-out infinite;
        }
        
        input:focus {
          ring-color: #12f6ff !important;
          border-color: #12f6ff !important;
          box-shadow: 0 0 0 2px rgba(18, 246, 255, 0.2) !important;
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
      `}</style>
    </div>
  )
}