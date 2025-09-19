// app/dashboard/terapeutico/page.tsx - VERSÃO CORRIGIDA COMPLETA

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
  User,
  ChevronDown
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
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

// ✅ COMPONENTE DROPDOWN DE BUSCA CORRIGIDO
const BuscaPacienteDropdown: React.FC<{
  onSelectPaciente: (paciente: Paciente) => void
  selectedPaciente: Paciente | null
  className?: string
}> = ({ onSelectPaciente, selectedPaciente, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)

  // Carregar todos os pacientes da clínica ordenados alfabeticamente
  const carregarPacientes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await supabaseApi.getPacientes()
      if (response.success && response.data) {
        // Ordenar alfabeticamente por nome
        const pacientesOrdenados = response.data
          .filter(p => p.nome_completo) // Filtrar nomes válidos
          .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''))
        
        setPacientes(pacientesOrdenados)
        console.log(`📋 PACIENTES CARREGADOS PARA DROPDOWN: ${pacientesOrdenados.length}`)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar pacientes para dropdown:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar pacientes ao abrir dropdown
  useEffect(() => {
    if (isOpen && pacientes.length === 0) {
      carregarPacientes()
    }
  }, [isOpen, pacientes.length, carregarPacientes])

  // Filtrar pacientes baseado no termo de busca
  const pacientesFiltrados = pacientes.filter(paciente => {
    const termo = searchTerm.toLowerCase()
    const nome = (paciente.nome_completo || '').toLowerCase()
    const cpf = (paciente.cpf || '').replace(/\D/g, '')
    const termoCpf = termo.replace(/\D/g, '')
    
    return nome.includes(termo) || cpf.includes(termoCpf)
  })

  // Formatar CPF para exibição
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-clinic-gray-300 mb-2">
        Selecionar Paciente:
      </label>
      
      {/* Campo principal */}
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center w-full px-3 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-white focus-within:border-cyan-400 transition-all duration-200">
          <Search className="h-4 w-4 text-clinic-gray-400 mr-2" />
          <span className="flex-1 text-left">
            {selectedPaciente 
              ? `${selectedPaciente.nome_completo} - ${formatCPF(selectedPaciente.cpf || '')}`
              : 'Selecione um paciente...'
            }
          </span>
          <ChevronDown className={`h-4 w-4 text-clinic-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg shadow-xl">
          {/* Campo de busca interno */}
          <div className="p-3 border-b border-clinic-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-clinic-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-clinic-gray-700 border border-clinic-gray-600 rounded text-white placeholder-clinic-gray-400 focus:border-cyan-400 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de pacientes */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-clinic-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent mx-auto mb-2"></div>
                Carregando pacientes...
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div className="p-4 text-center text-clinic-gray-400">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </div>
            ) : (
              pacientesFiltrados.map((paciente) => (
                <div
                  key={`paciente-${paciente.id_paciente}`} // ✅ KEY ÚNICO
                  className="p-3 hover:bg-clinic-gray-700 cursor-pointer border-b border-clinic-gray-700 last:border-b-0 transition-colors"
                  onClick={() => {
                    onSelectPaciente(paciente)
                    setSearchTerm('')
                    setIsOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-white font-medium">
                      {paciente.nome_completo}
                    </span>
                    <span className="text-clinic-gray-400 text-sm">
                      CPF: {formatCPF(paciente.cpf || '')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default function DashboardIAPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  
  // Estados do paciente selecionado
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  
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

  // ✅ CARREGAR RESUMOS DO PACIENTE SELECIONADO - CORRIGIDO
  const loadResumosPaciente = useCallback(async (paciente: Paciente) => {
    if (!paciente.cpf) return
    
    try {
      setLoading(true)
      console.log(`📊 CARREGANDO RESUMOS PARA: ${paciente.nome_completo} (${paciente.cpf})`)
      
      const [diarios, semanais] = await Promise.all([
        supabaseApi.getResumosDiariosPaciente(paciente.cpf),
        supabaseApi.getResumosSemanasPaciente(paciente.cpf)
      ])
      
      setResumosDiarios(diarios || [])
      setResumosSemanais(semanais || [])
      
      // Auto-selecionar primeira data se disponível
      if (diarios && diarios.length > 0) {
        const primeiraData = diarios[0].data_resumo
        setSelectedDate(primeiraData)
        loadConversaDia(paciente.cpf, primeiraData)
      } else {
        setSelectedDate('')
        setConversaDia(null)
      }
      
      console.log(`✅ RESUMOS CARREGADOS: ${diarios?.length || 0} diários, ${semanais?.length || 0} semanais`)
      
    } catch (error) {
      console.error('❌ Erro ao carregar resumos:', error)
      setResumosDiarios([])
      setResumosSemanais([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ✅ CARREGAR CONVERSA DO DIA - CORRIGIDO
  const loadConversaDia = useCallback(async (cpf: string, data: string) => {
    if (!cpf || !data) return
    
    try {
      setLoadingConversa(true)
      console.log(`💬 CARREGANDO CONVERSA: CPF=${cpf}, Data=${data}`)
      
      const conversa = await supabaseApi.getResumoEspecifico(cpf, data)
      setConversaDia(conversa)
      
      console.log(`${conversa ? '✅ CONVERSA ENCONTRADA' : '⚠️ CONVERSA NÃO ENCONTRADA'}`)
      
    } catch (error) {
      console.error('❌ Erro ao carregar conversa:', error)
      setConversaDia(null)
    } finally {
      setLoadingConversa(false)
    }
  }, [])

  // ✅ HANDLE SELECT PACIENTE - CORRIGIDO
  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    console.log(`👤 PACIENTE SELECIONADO: ${paciente.nome_completo} (${paciente.cpf})`)
    setSelectedPaciente(paciente)
    loadResumosPaciente(paciente)
  }, [loadResumosPaciente])

  // ✅ HANDLE SELECT DATE - CORRIGIDO
  const handleSelectDate = useCallback((data: string) => {
    setSelectedDate(data)
    if (selectedPaciente?.cpf) {
      loadConversaDia(selectedPaciente.cpf, data)
    }
  }, [selectedPaciente?.cpf, loadConversaDia])

  // ✅ FORMATAR DATA - CORRIGIDO
  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase()
    } catch {
      return dateString
    }
  }, [])

  // ✅ RENDER CONVERSA - CORRIGIDO COM KEYS ÚNICOS
  const renderConversa = useCallback((resumoInteracao: string) => {
    if (!resumoInteracao) {
      return <p className="text-clinic-gray-400 text-center py-8">Nenhuma conversa disponível</p>
    }
    
    try {
      // Split mais robusto mantendo delimitadores
      const parts = resumoInteracao.split(/(\*\*(?:PACIENTE|EVELYN)\*\*:)/).filter(part => part.trim())
      
      const elementos: JSX.Element[] = []
      let currentSpeaker = ''
      
      parts.forEach((part, index) => {
        const trimmedPart = part.trim()
        if (!trimmedPart) return
        
        if (trimmedPart.includes('**PACIENTE**:')) {
          currentSpeaker = 'PACIENTE'
          elementos.push(
            <div key={`speaker-paciente-${index}`} className="text-cyan-400 font-semibold mb-2">
              PACIENTE:
            </div>
          )
        } else if (trimmedPart.includes('**EVELYN**:')) {
          currentSpeaker = 'ALICE'
          elementos.push(
            <div key={`speaker-alice-${index}`} className="text-purple-400 font-semibold mb-2">
              ALICE:
            </div>
          )
        } else if (trimmedPart && currentSpeaker) {
          const isFromPaciente = currentSpeaker === 'PACIENTE'
          elementos.push(
            <div 
              key={`message-${currentSpeaker}-${index}`} // ✅ KEY ÚNICO BASEADO EM SPEAKER + INDEX
              className={`p-3 rounded-lg mb-3 ${
                isFromPaciente 
                  ? 'bg-cyan-950/30 border-l-4 border-cyan-400 ml-6' 
                  : 'bg-purple-950/30 border-l-4 border-purple-400 mr-6'
              }`}
            >
              <p className="text-clinic-gray-200 leading-relaxed">{trimmedPart}</p>
            </div>
          )
        }
      })
      
      return <div className="space-y-2">{elementos}</div>
      
    } catch (error) {
      console.error('❌ Erro ao renderizar conversa:', error)
      return <p className="text-red-400 text-center py-4">Erro ao carregar conversa</p>
    }
  }, [])

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        
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
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
                className="border-clinic-gray-600 hover:bg-clinic-gray-700"
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="secondary"
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
            variant={isCurrentPage('/dashboard') ? "primary" : "secondary"}
            className="flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button
            onClick={() => router.push('/estoque')}
            variant={isCurrentPage('/estoque') ? "primary" : "secondary"}
            className="flex items-center space-x-2"
          >
            <Package className="h-4 w-4" />
            <span>Estoque</span>
          </Button>
          
          <Button
            onClick={() => router.push('/pacientes')}
            variant={isCurrentPage('/pacientes') ? "primary" : "secondary"}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Pacientes</span>
          </Button>

          <Button
            variant="primary"
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
          >
            <Bot className="h-4 w-4" />
            <span>Paciente - IA</span>
          </Button>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Busca e Timeline */}
          <Card className="bg-clinic-gray-800 border-clinic-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Dados do Paciente
            </h2>
            
            {/* ✅ BUSCA DROPDOWN CORRIGIDA */}
            <BuscaPacienteDropdown
              onSelectPaciente={handleSelectPaciente}
              selectedPaciente={selectedPaciente}
              className="mb-6"
            />

            {/* Dados do Paciente Selecionado */}
            {selectedPaciente && (
              <div className="space-y-4 mb-6">
                <div className="bg-clinic-gray-900 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-cyan-400" />
                    <span className="text-clinic-gray-400 text-sm">Nome:</span>
                  </div>
                  <p className="text-white font-medium">{selectedPaciente.nome_completo}</p>
                </div>

                <div className="bg-clinic-gray-900 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-cyan-400" />
                    <span className="text-clinic-gray-400 text-sm">CPF:</span>
                  </div>
                  <p className="text-white font-mono">{selectedPaciente.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                </div>
              </div>
            )}

            {/* Timeline de Datas com Interação */}
            {resumosDiarios.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                  Dias com Interação
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {resumosDiarios.map((resumo) => (
                    <div
                      key={`data-${resumo.id_resumo_di}`} // ✅ KEY ÚNICO BASEADO EM ID
                      onClick={() => handleSelectDate(resumo.data_resumo)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 text-center text-sm font-medium ${
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

          {/* Colunas 2 e 3: Conversa do Dia */}
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
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent mr-3"></div>
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