'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-clinic-black">
      <div className="absolute inset-0 bg-gradient-to-br from-clinic-cyan/10 via-transparent to-clinic-cyan-dark/10" />
      
      <Card className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 bg-clinic-cyan/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-clinic-cyan" />
          </div>
          <h1 className="text-3xl font-bold text-clinic-white">Clínica Ballarin</h1>
          <p className="text-clinic-gray-400 mt-2">Sistema de Gestão</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Nome do Usuário"
            type="text"
            value={loginForm.username}
            onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Digite seu usuário"
            required
          />
          
          <Input
            label="Senha"
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Digite sua senha"
            required
          />
          
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          
          {loginError && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center">{loginError}</p>
            </div>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-clinic-gray-700">
          <div className="text-center text-xs text-clinic-gray-500">
            <p>Usuários de teste:</p>
            <p className="mt-1">admin / admin123 (Dashboard)</p>
            <p>estoque / estoque123 (Controle de Estoque)</p>
          </div>
        </div>
      </Card>
    </div>
  )
}