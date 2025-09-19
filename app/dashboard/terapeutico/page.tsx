'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Package, 
  Users, 
  LogOut, 
  Sun, 
  Moon, 
  Home, 
  Search,
  Bot,
  Calendar,
  MessageCircle,
  User
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario, Paciente } from '@/types/database'

interface ResumosDiarios {
  id_resumo_di: number
  cpf: string
  nome_paciente: string | null
  resumo_interacao: string
  status_processamento: string
  data_resumo: string
  data_criacao: string
}

interface ResumosSemanais {
  id_resumo_sem: number
  cpf: string
  nome_paciente: string | null
  data_inicio_semana: string
  data_fim_semana: string
  resumo_geral_semana: string
  data_geracao: string
}

export default function DashboardIAPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  
  // Estados de busca de paciente
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Paciente[]>([])
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [showResults, setShowResults] = useState(false)
  
  // Estados dos resumos
  const [resumosDiarios, setResumosDiarios] = useState<ResumosDiarios[]>([])
  const [resumosSemanais, setResumosSemanais] = useState<ResumosSemanais[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [conversaDia, setConversaDia] = useState<ResumosDiarios | null>(null)
  const [loadingConversa, setLoadingConversa] = useState(false)

  // Detectar página atual
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard/terapeutico'
  const isCurrentPage = (path: string) => currentPath === path

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme)
    localStorage.setItem('ballarin_theme', !isDarkTheme ? 'dark' : 'light')
  }

  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem('ballarin_theme')
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark')
    }
  }, [])

  // Aplicar tema no documento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light')
    }
  }, [isDarkTheme])

  // Verificar autenticação
  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (!userData) {
      router.push('/login')
      return
    }
    
    try {
      const user = JSON.parse(userData) as Usuario
      setCurrentUser(user)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Debounce para busca de pacientes
  const debounceSearch = useCallback(
    (term: string) => {
      if (term.length < 2) {
        setSearchResults([])
        setShowResults(false)
        return
      }
      
      const searchPacientes = async () => {
        try {
          const results = await supabaseApi.searchPacientes(term)
          setSearchResults(results)
          setShowResults(results.length > 0)
        } catch (error) {
          console.error('Erro na busca:', error)
        }
      }

      const timeoutId = setTimeout(searchPacientes, 300)
      return () => clearTimeout(timeoutId)
    },
    []
  )

  // Buscar pacientes quando o termo muda
  useEffect(() => {
    const cleanup = debounceSearch(searchTerm)
    return cleanup
  }, [searchTerm, debounceSearch])

  // Carregar resumos do paciente selecionado
  const loadResumosPaciente = async (paciente: Paciente) => {
    try {
      setLoading(true)
      const [diarios, semanais] = await Promise.all([
        supabaseApi.getResumosDiariosPaciente(paciente.cpf),
        supabaseApi.getResumosSemanasPaciente(paciente.cpf)
      ])
      
      setResumosDiarios(diarios)
      setResumosSemanais(semanais)
      
      // Selecionar primeira data automaticamente se houver dados
      if (diarios.length > 0) {
        const primeiraData = diarios[0].data_resumo
        setSelectedDate(primeiraData)
        loadConversaDia(paciente.cpf, primeiraData)
      }
    } catch (error) {
      console.error('Erro ao carregar resumos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Carregar conversa de um dia específico
  const loadConversaDia = async (cpf: string, data: string) => {
    try {
      setLoadingConversa(true)
      const conversa = await supabaseApi.getResumoEspecifico(cpf, data)
      setConversaDia(conversa)
    } catch (error) {
      console.error('Erro ao carregar conversa:', error)
    } finally {
      setLoadingConversa(false)
    }
  }

  // Selecionar paciente
  const handleSelectPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setSearchTerm(`${paciente.nome} - ${formatCPF(paciente.cpf)}`)
    setShowResults(false)
    loadResumosPaciente(paciente)
  }

  // Selecionar data
  const handleSelectDate = (data: string) => {
    setSelectedDate(data)
    if (selectedPaciente) {
      loadConversaDia(selectedPaciente.cpf, data)
    }
  }

  // Formatar CPF
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase()
  }

  // Renderizar conversa formatada
  const renderConversa = (resumoInteracao: string) => {
    if (!resumoInteracao) return <p className="text-clinic-gray-400">Nenhuma conversa disponível</p>
    
    // Dividir por **PACIENTE** e **EVELYN**
    const parts = resumoInteracao.split(/(\*\*(?:PACIENTE|EVELYN)\*\*:)/)
    
    return (
      <div className="space-y-4">
        {parts.map((part, index) => {
          if (part.includes('**PACIENTE**:')) {
            return <div key={index} className="text-cyan-400 font-semibold">PACIENTE:</div>
          } else if (part.includes('**EVELYN**:')) {
            return <div key={index} className="text-purple-400 font-semibold">ALICE:</div>
          } else if (part.trim()) {
            const isFromPaciente = parts[index - 1]?.includes('**PACIENTE**')
            return (
              <div key={index} className={`p-3 rounded-lg ${
                isFromPaciente 
                  ? 'bg-cyan-950/30 border-l-4 border-cyan-400 ml-6' 
                  : 'bg-purple-950/30 border-l-4 border-purple-400 mr-6'
              }`}>
                <p className="text-clinic-gray-200 leading-relaxed">{part.trim()}</p>
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4" />
          <p className="text-clinic-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="container mx-auto px-4 py0">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-clinic-gray-800 via-clinic-gray-750 to-clinic-gray-700 rounded-xl p-6 mb-6 border border-clinic-gray-600 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  src="/justiconecta.png"
                  alt="JustiConecta"
                  width={70}
                  height={70}
                  className="rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Interações Paciente - IA
                </h1>
                <p className="text-clinic-gray-300">
                  Acompanhe todas as conversas entre pacientes e nossa assistente virtual ALICE
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="border-clinic-gray-600 hover:bg-clinic-gray-700"
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-clinic-gray-600 hover:bg-red-900/50 hover:border-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Navegação */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            onClick={() => router.push('/dashboard')}
            variant={isCurrentPage('/dashboard') ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button
            onClick={() => router.push('/estoque')}
            variant={isCurrentPage('/estoque') ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <Package className="h-4 w-4" />
            <span>Estoque</span>
          </Button>
          
          <Button
            onClick={() => router.push('/pacientes')}
            variant={isCurrentPage('/pacientes') ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Pacientes</span>
          </Button>

          <Button
            variant="default"
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
          >
            <Bot className="h-4 w-4" />
            <span>Paciente - IA</span>
          </Button>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Busca e Dados do Paciente */}
          <Card className="bg-clinic-gray-800 border-clinic-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Dados do Paciente
            </h2>
            
            {/* Campo de Busca */}
            <div className="relative mb-6">
              <label className="block text-sm font-medium text-clinic-gray-300 mb-2">
                Selecionar Paciente:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-clinic-gray-400" />
                <Input
                  placeholder="Digite nome ou CPF do paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-clinic-gray-900 border-clinic-gray-600 text-white"
                />
              </div>
              
              {/* Resultados da Busca */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-clinic-gray-900 border border-clinic-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((paciente) => (
                    <div
                      key={paciente.id_paciente}
                      onClick={() => handleSelectPaciente(paciente)}
                      className="p-3 hover:bg-clinic-gray-700 cursor-pointer border-b border-clinic-gray-700 last:border-b-0"
                    >
                      <div className="text-white font-medium">{paciente.nome}</div>
                      <div className="text-clinic-gray-400 text-sm">{formatCPF(paciente.cpf)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Informações do Paciente Selecionado */}
            {selectedPaciente && (
              <div className="space-y-3">
                <div className="bg-clinic-gray-900 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-clinic-gray-300">Nome:</span>
                  </div>
                  <p className="text-white font-medium">{selectedPaciente.nome}</p>
                </div>
                
                <div className="bg-clinic-gray-900 p-4 rounded-lg">
                  <div className="text-sm text-clinic-gray-300 mb-1">CPF:</div>
                  <p className="text-white font-mono">{formatCPF(selectedPaciente.cpf)}</p>
                </div>
              </div>
            )}

            {/* Dias com Interação */}
            {resumosDiarios.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
                  Dias com Interação
                </h3>
                <div className="space-y-2">
                  {resumosDiarios.map((resumo) => (
                    <div
                      key={resumo.id_resumo_di}
                      onClick={() => handleSelectDate(resumo.data_resumo)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDate === resumo.data_resumo
                          ? 'bg-cyan-600 text-white'
                          : 'bg-clinic-gray-900 text-clinic-gray-300 hover:bg-clinic-gray-700'
                      }`}
                    >
                      {formatDate(resumo.data_resumo)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Coluna 2 e 3: Conversa do Dia */}
          <Card className="lg:col-span-2 bg-clinic-gray-800 border-clinic-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-purple-400" />
                Conversa do dia {selectedDate ? formatDate(selectedDate) : ''}
              </h2>
              
              {selectedPaciente && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400">ALICE Online</span>
                </div>
              )}
            </div>

            {/* Área da Conversa */}
            <div className="bg-clinic-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              {loadingConversa ? (
                <div className="flex items-center justify-center h-full">
                  <div className="loading-spinner" />
                  <span className="ml-2 text-clinic-gray-400">Carregando conversa...</span>
                </div>
              ) : conversaDia ? (
                renderConversa(conversaDia.resumo_interacao)
              ) : selectedPaciente ? (
                <div className="flex items-center justify-center h-full text-clinic-gray-400">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecione uma data para ver a conversa</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-clinic-gray-400">
                  <div className="text-center">
                    <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecione um paciente para ver as conversas</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}