'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bot, 
  MessageCircle, 
  Calendar,
  User,
  Search,
  CalendarDays
} from 'lucide-react'
import { Card, HeaderUniversal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import NovaClinicaModal from '@/components/NovaClinicaModal'

// Tipos
interface Usuario {
  id?: number
  usuario: string
  nome_completo: string
  role: string
  id_clinica: number
}

interface Paciente {
  id_paciente: number
  nome_completo: string
  cpf: string
  data_nascimento?: string
  celular?: string
}

interface ResumosDiarios {
  id_resumo_diario: number
  cpf: string
  nome_paciente: string
  resumo_interacoes: string
  status_processamento: string
  data_resumo: string
  data_criacao: string
  id_clinica: number
}

interface ResumosSemanais {
  id_resumo_sem: number
  cpf: string
  nome_paciente: string
  data_inicio_semana: string
  data_fim_semana: string
  resumo_geral_semana: string
  data_geracao: string
  id_clinica: number
}

// Componente de Busca de Paciente com Dropdown
function BuscaPacienteDropdown({ 
  onSelectPaciente, 
  selectedPaciente,
  className = ''
}: { 
  onSelectPaciente: (paciente: Paciente) => void
  selectedPaciente: Paciente | null
  className?: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [filteredPacientes, setFilteredPacientes] = useState<Paciente[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPacientes()
  }, [])

  const loadPacientes = async () => {
    try {
      setLoading(true)
      const data = await supabaseApi.getPacientes(100)
      setPacientes(data)
      setFilteredPacientes(data.slice(0, 10))
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = pacientes.filter(p => 
        p.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf?.includes(searchTerm.replace(/\D/g, ''))
      ).slice(0, 10)
      setFilteredPacientes(filtered)
      setIsOpen(true)
    } else {
      setFilteredPacientes(pacientes.slice(0, 10))
    }
  }, [searchTerm, pacientes])

  const handleSelect = (paciente: Paciente) => {
    onSelectPaciente(paciente)
    setSearchTerm('')
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-clinic-gray-300 mb-2">
        Selecionar Paciente:
      </label>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-clinic-gray-400" />
        <input
          type="text"
          placeholder={selectedPaciente ? `${selectedPaciente.nome_completo} - ${selectedPaciente.cpf}` : "Buscar por nome ou CPF..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:ring-2 focus:ring-clinic-cyan focus:border-transparent"
        />
      </div>

      {isOpen && (
        <div 
          className="absolute w-full mt-1 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          {loading ? (
            <div className="p-4 text-center text-clinic-gray-400">Carregando...</div>
          ) : filteredPacientes.length === 0 ? (
            <div className="p-4 text-center text-clinic-gray-400">Nenhum paciente encontrado</div>
          ) : (
            filteredPacientes.map(paciente => (
              <button
                key={paciente.id_paciente}
                onClick={() => handleSelect(paciente)}
                className="w-full px-4 py-3 text-left bg-clinic-gray-800 hover:bg-clinic-gray-700 transition-colors border-b border-clinic-gray-700 last:border-b-0"
              >
                <p className="font-medium text-clinic-white">{paciente.nome_completo}</p>
                <p className="text-sm text-clinic-gray-400">
                  CPF: {paciente.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0" 
          style={{ zIndex: 9998 }}
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
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [resumosDiarios, setResumosDiarios] = useState<ResumosDiarios[]>([])
  const [resumosSemanais, setResumosSemanais] = useState<ResumosSemanais[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [conversaDia, setConversaDia] = useState<ResumosDiarios | null>(null)
  const [loadingConversa, setLoadingConversa] = useState(false)
  const [viewMode, setViewMode] = useState<'diario' | 'semanal'>('diario')

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

  const handleShowNovaClinicaModal = () => {
    setShowNovaClinicaModal(true)
  }

  const handleClinicaCriada = () => {
    setShowNovaClinicaModal(false)
  }

  // ✅ CARREGAR RESUMOS - DIÁRIOS E SEMANAIS
  const loadResumosPaciente = useCallback(async (paciente: Paciente) => {
    if (!paciente.cpf) return
    
    try {
      setLoading(true)
      console.log(`📊 CARREGANDO RESUMOS PARA: ${paciente.nome_completo} (${paciente.cpf})`)
      
      // Carregar diários
      const diarios = await supabaseApi.getResumosDiariosPaciente(paciente.cpf)
      setResumosDiarios(diarios || [])
      
      // Carregar semanais - com verificação de existência da função
      try {
        if (typeof supabaseApi.getResumosDiariosPaciente === 'function') {
          const semanais = await supabaseApi.getResumosDiariosPaciente(paciente.cpf)
          setResumosSemanais(semanais || [])
        } else {
          console.log('⚠️ Função getResumosSemanasPaciente não disponível')
          setResumosSemanais([])
        }
      } catch (err) {
        console.log('⚠️ Erro ao carregar semanais:', err)
        setResumosSemanais([])
      }
      
      // Auto-selecionar primeira data se disponível
      if (diarios && diarios.length > 0) {
        const primeiraDataReal = diarios[0].data_resumo
        console.log(`✅ AUTO-SELECIONANDO DATA REAL: ${primeiraDataReal}`)
        setSelectedDate(primeiraDataReal)
        loadConversaDia(paciente.cpf, primeiraDataReal)
      } else {
        setSelectedDate('')
        setConversaDia(null)
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar resumos:', error)
      setResumosDiarios([])
      setResumosSemanais([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadConversaDia = useCallback(async (cpf: string, dataResumo: string) => {
    if (!cpf || !dataResumo) return
    
    try {
      setLoadingConversa(true)
      console.log(`💬 CARREGANDO CONVERSA EXATA: CPF=${cpf}, Data=${dataResumo}`)
      
      const conversa = await supabaseApi.getResumoEspecifico(cpf, dataResumo)
      setConversaDia(conversa)
      
    } catch (error) {
      console.error('❌ Erro ao carregar conversa:', error)
      setConversaDia(null)
    } finally {
      setLoadingConversa(false)
    }
  }, [])

  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    console.log(`👤 PACIENTE SELECIONADO: ${paciente.nome_completo} (${paciente.cpf})`)
    setSelectedPaciente(paciente)
    loadResumosPaciente(paciente)
  }, [loadResumosPaciente])

  const handleSelectDate = useCallback((dataResumo: string) => {
    console.log(`📅 DATA SELECIONADA: ${dataResumo}`)
    setSelectedDate(dataResumo)
    if (selectedPaciente?.cpf) {
      loadConversaDia(selectedPaciente.cpf, dataResumo)
    }
  }, [selectedPaciente?.cpf, loadConversaDia])

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

  // Render Conversa - Parser WhatsApp Style
  const renderConversa = useCallback((resumoInteracoes: string) => {
    if (!resumoInteracoes || resumoInteracoes.trim() === '') {
      return (
        <div className="text-center py-8">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30 text-clinic-gray-500" />
          <p className="text-clinic-gray-400">Conversa vazia ou sem conteúdo</p>
        </div>
      )
    }
    
    try {
      let mensagens: Array<{speaker: string, texto: string}> = []
      
      const blocosPaciente = resumoInteracoes.split(/\*\*PACIENTE\*\*:?\s*/i).filter(bloco => bloco.trim())
      
      blocosPaciente.forEach((bloco) => {
        const partesBloco = bloco.split(/\*\*(EVELYN|AGENTE|AGENT)\s*IA\*\*:?\s*/i)
        
        if (partesBloco.length >= 2) {
          const mensagemPaciente = partesBloco[0]?.trim()
          if (mensagemPaciente) {
            mensagens.push({ speaker: 'PACIENTE', texto: mensagemPaciente })
          }
          
          const respostaIA = partesBloco[2]?.trim() || partesBloco[1]?.trim()
          if (respostaIA) {
            mensagens.push({ speaker: 'Agente IA', texto: respostaIA })
          }
        } else {
          const textoLimpo = bloco.trim()
          if (textoLimpo) {
            mensagens.push({ speaker: 'PACIENTE', texto: textoLimpo })
          }
        }
      })
      
      if (mensagens.length === 0) {
        const partes = resumoInteracoes.split(/\*\*(PACIENTE|EVELYN|AGENTE|AGENT|IA)\*\*:?\s*/gi)
        
        for (let i = 1; i < partes.length; i += 2) {
          const speaker = partes[i - 1]?.toUpperCase() || ''
          const texto = partes[i]?.trim() || ''
          
          if (texto) {
            const isPatient = speaker.includes('PACIENTE')
            mensagens.push({
              speaker: isPatient ? 'PACIENTE' : 'Agente IA',
              texto: texto
            })
          }
        }
      }
      
      if (mensagens.length === 0) {
        return (
          <div className="text-center py-8">
            <p className="text-yellow-400 mb-4">⚠️ Não foi possível parsear a conversa</p>
            <div className="bg-clinic-gray-800 p-4 rounded-lg text-left text-xs text-clinic-gray-300 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{resumoInteracoes}</pre>
            </div>
          </div>
        )
      }
      
      // Render WhatsApp Style
      return (
        <div className="space-y-4 p-2">
          {mensagens.map((mensagem, index) => {
            const isPatient = mensagem.speaker === 'PACIENTE'
            
            return (
              <div 
                key={`msg-${index}-${mensagem.speaker}`}
                className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-lg ${
                    isPatient 
                      ? 'bg-cyan-600 text-white rounded-br-sm'
                      : 'bg-purple-600 text-white rounded-bl-sm'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 opacity-90 ${
                    isPatient ? 'text-cyan-100' : 'text-purple-100'
                  }`}>
                    {mensagem.speaker}
                  </div>
                  
                  <div className="text-sm leading-relaxed">
                    {mensagem.texto}
                  </div>
                  
                  <div className={`text-xs mt-1 opacity-75 text-right ${
                    isPatient ? 'text-cyan-200' : 'text-purple-200'
                  }`}>
                    {new Date().toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
      
    } catch (error) {
      console.error('❌ ERRO ao renderizar conversa:', error)
      return (
        <div className="text-center py-8">
          <p className="text-red-400">Erro ao renderizar conversa</p>
        </div>
      )
    }
  }, [])

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        
        {/* Header Universal */}
        <HeaderUniversal 
          titulo="Interações Paciente - IA" 
          descricao="Acompanhe todas as conversas entre pacientes e sua assistente virtual"
          icone={Bot}
          showNovaClinicaModal={handleShowNovaClinicaModal}
        />

        {/* Navegação por Tabs */}
        <div className="mb-8">
          <div className="border-b border-clinic-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300"
              >
                Marketing e Terapêutico
              </button>
              <button
                className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-clinic-cyan text-clinic-cyan"
              >
                IA - Paciente
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Busca e Timeline */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-clinic-white mb-4">
              Dados do Paciente
            </h2>
            
            <BuscaPacienteDropdown
              onSelectPaciente={handleSelectPaciente}
              selectedPaciente={selectedPaciente}
              className="mb-6"
            />

            {selectedPaciente && (
              <div className="space-y-4 mb-6">
                <div className="bg-clinic-gray-900 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-clinic-cyan" />
                    <span className="text-clinic-gray-400 text-sm">Nome:</span>
                  </div>
                  <p className="text-clinic-white font-medium">{selectedPaciente.nome_completo}</p>
                </div>

                <div className="bg-clinic-gray-900 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-clinic-cyan" />
                    <span className="text-clinic-gray-400 text-sm">CPF:</span>
                  </div>
                  <p className="text-clinic-white font-mono">{selectedPaciente.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                </div>
              </div>
            )}

            {/* Toggle Diário/Semanal */}
            {selectedPaciente && (resumosDiarios.length > 0 || resumosSemanais.length > 0) && (
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setViewMode('diario')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'diario'
                      ? 'bg-clinic-cyan text-clinic-black'
                      : 'bg-clinic-gray-800 text-clinic-gray-400 hover:bg-clinic-gray-700'
                  }`}
                >
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Diário ({resumosDiarios.length})
                </button>
                <button
                  onClick={() => setViewMode('semanal')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'semanal'
                      ? 'bg-clinic-cyan text-clinic-black'
                      : 'bg-clinic-gray-800 text-clinic-gray-400 hover:bg-clinic-gray-700'
                  }`}
                >
                  <CalendarDays className="h-4 w-4 inline mr-1" />
                  Semanal ({resumosSemanais.length})
                </button>
              </div>
            )}

            {/* Timeline Diária */}
            {viewMode === 'diario' && resumosDiarios.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-clinic-white mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-clinic-cyan" />
                  Dias com Interação
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {resumosDiarios.map((resumo) => (
                    <div
                      key={`timeline-${resumo.id_resumo_diario}-${resumo.data_resumo}`}
                      onClick={() => handleSelectDate(resumo.data_resumo)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 text-center text-sm font-medium ${
                        selectedDate === resumo.data_resumo
                          ? 'bg-clinic-cyan text-clinic-black'
                          : 'bg-clinic-gray-800 text-clinic-gray-300 hover:bg-clinic-gray-700'
                      }`}
                    >
                      <div className="font-medium">
                        {formatDate(resumo.data_resumo)}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {resumo.resumo_interacoes ? 
                          `${resumo.resumo_interacoes.length} chars` : 
                          'Sem conversa'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Semanal */}
            {viewMode === 'semanal' && resumosSemanais.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-clinic-white mb-3 flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-purple-400" />
                  Resumos Semanais
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {resumosSemanais.map((resumo) => (
                    <div
                      key={`semanal-${resumo.id_resumo_sem}`}
                      className="p-3 rounded-lg bg-clinic-gray-800 text-clinic-gray-300"
                    >
                      <div className="font-medium text-sm">
                        {formatDate(resumo.data_inicio_semana)} - {formatDate(resumo.data_fim_semana)}
                      </div>
                      <div className="text-xs opacity-75 mt-2 line-clamp-3">
                        {resumo.resumo_geral_semana?.substring(0, 150) || 'Sem resumo'}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Colunas 2 e 3: Conversa do Dia */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-clinic-white flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-purple-400" />
                Conversa do dia {selectedDate ? formatDate(selectedDate) : ''}
              </h2>
              
              {selectedPaciente && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400">Agente IA Online</span>
                </div>
              )}
            </div>

            {/* Área da Conversa - WhatsApp Style */}
            <div className="bg-clinic-gray-900 rounded-lg h-96 overflow-y-auto">
              {loadingConversa ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mr-3"></div>
                  <span className="ml-2 text-clinic-gray-400">Carregando conversa...</span>
                </div>
              ) : conversaDia ? (
                renderConversa(conversaDia.resumo_interacoes)
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

        {/* Modal Nova Clínica */}
        <NovaClinicaModal
          isOpen={showNovaClinicaModal}
          onClose={() => setShowNovaClinicaModal(false)}
          onSuccess={handleClinicaCriada}
        />
      </div>
    </div>
  )
}