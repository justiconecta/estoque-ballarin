'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bot, 
  MessageCircle, 
  Calendar,
  User,
  CalendarDays,
  FileText
} from 'lucide-react'
import { Card, HeaderUniversal } from '@/components/ui'
import { useData, useResumosPaciente } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import BuscaPacienteDropdown from '@/components/BuscaPacienteDropdown'
import NovaClinicaModal from '@/components/NovaClinicaModal'

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

export default function DashboardIAPage() {
  const router = useRouter()
  
  // ✅ USA AUTH CONTEXT (não localStorage)
  const { isAuthenticated, loading: authLoading, profile } = useAuth()
  
  // ✅ DADOS DO CACHE GLOBAL + FUNÇÃO PARA PACIENTES COM RESUMOS
  const { getResumoEspecifico, getPacientesComResumos, loading: dataLoading } = useData()
  
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [conversaDia, setConversaDia] = useState<ResumosDiarios | null>(null)
  const [loadingConversa, setLoadingConversa] = useState(false)
  const [viewMode, setViewMode] = useState<'diario' | 'semanal'>('diario')
  
  // ✅ ESTADOS PARA RESUMO SEMANAL SELECIONADO
  const [selectedResumoSemanal, setSelectedResumoSemanal] = useState<ResumosSemanais | null>(null)
  
  // ✅ ESTADO PARA PACIENTES COM RESUMOS
  const [pacientesComResumos, setPacientesComResumos] = useState<Paciente[]>([])
  const [loadingPacientes, setLoadingPacientes] = useState(true)

  // ✅ HOOK DE RESUMOS DO PACIENTE (com cache)
  const { resumosDiarios, resumosSemanais, loading: resumosLoading } = useResumosPaciente(selectedPaciente?.cpf || null)

  // ✅ CARREGAR PACIENTES COM RESUMOS QUANDO INICIALIZAR
  useEffect(() => {
    const loadPacientesComResumos = async () => {
      // ✅ VERIFICA CLINIC_ID DIRETAMENTE (não depende de initialized)
      const clinicId = typeof window !== 'undefined' ? localStorage.getItem('clinic_id') : null
      if (!clinicId) return
      
      setLoadingPacientes(true)
      try {
        const pacientes = await getPacientesComResumos()
        setPacientesComResumos(pacientes)
        console.log(`✅ Dashboard Terapêutico: ${pacientes.length} pacientes com resumos`)
      } catch (error) {
        console.error('❌ Erro ao carregar pacientes com resumos:', error)
      } finally {
        setLoadingPacientes(false)
      }
    }
    
    loadPacientesComResumos()
  }, [getPacientesComResumos]) // ✅ Removido 'initialized' - agora verifica clinic_id diretamente

  // Carregar conversa específica (diário)
  const loadConversaDia = useCallback(async (cpf: string, dataResumo: string) => {
    if (!cpf || !dataResumo) return
    
    setLoadingConversa(true)
    try {
      console.log(`💬 Carregando conversa: CPF=${cpf}, Data=${dataResumo}`)
      const conversa = await getResumoEspecifico(cpf, dataResumo)
      setConversaDia(conversa)
      // Limpar resumo semanal quando selecionar diário
      setSelectedResumoSemanal(null)
    } catch (error) {
      console.error('❌ Erro ao carregar conversa:', error)
      setConversaDia(null)
    } finally {
      setLoadingConversa(false)
    }
  }, [getResumoEspecifico])

  // Handler de seleção de paciente
  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    console.log(`👤 Paciente selecionado: ${paciente.nome_completo}`)
    setSelectedPaciente(paciente)
    setSelectedDate('')
    setConversaDia(null)
    setSelectedResumoSemanal(null)
  }, [])

  // Auto-selecionar primeira data quando resumos carregam
  useEffect(() => {
    if (viewMode === 'diario' && resumosDiarios.length > 0 && !selectedDate && selectedPaciente) {
      const primeiraData = resumosDiarios[0].data_resumo
      setSelectedDate(primeiraData)
      loadConversaDia(selectedPaciente.cpf, primeiraData)
    }
  }, [resumosDiarios, selectedDate, selectedPaciente, loadConversaDia, viewMode])

  // Auto-selecionar primeiro resumo semanal quando troca para modo semanal
  useEffect(() => {
    if (viewMode === 'semanal' && resumosSemanais.length > 0 && !selectedResumoSemanal && selectedPaciente) {
      setSelectedResumoSemanal(resumosSemanais[0])
      setConversaDia(null)
      setSelectedDate('')
    }
  }, [viewMode, resumosSemanais, selectedResumoSemanal, selectedPaciente])

  // Handler de seleção de data (diário)
  const handleSelectDate = useCallback((dataResumo: string) => {
    setSelectedDate(dataResumo)
    setSelectedResumoSemanal(null)
    if (selectedPaciente?.cpf) {
      loadConversaDia(selectedPaciente.cpf, dataResumo)
    }
  }, [selectedPaciente?.cpf, loadConversaDia])

  // ✅ Handler de seleção de resumo semanal
  const handleSelectResumoSemanal = useCallback((resumo: ResumosSemanais) => {
    console.log(`📅 Resumo semanal selecionado: ${resumo.data_inicio_semana} - ${resumo.data_fim_semana}`)
    setSelectedResumoSemanal(resumo)
    setConversaDia(null)
    setSelectedDate('')
  }, [])

  // Formatador de data
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

  // Formatador de CPF
  const formatCPF = useCallback((cpf: string) => {
    if (!cpf) return ''
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }, [])

  // Render Conversa - Parser WhatsApp Style (memoizado)
  const renderConversa = useMemo(() => {
    return (resumoInteracoes: string) => {
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
                  key={`msg-${index}`}
                  className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-lg ${
                      isPatient 
                        ? 'bg-cyan-600 text-white rounded-br-sm'
                        : 'bg-purple-600 text-white rounded-bl-sm'
                    }`}
                  >
                    <p className="text-xs font-bold mb-1 opacity-80">
                      {isPatient ? '👤 Paciente' : '🤖 Agente IA'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{mensagem.texto}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )
      } catch (error) {
        console.error('Erro ao parsear conversa:', error)
        return (
          <div className="text-center py-8 text-red-400">
            Erro ao processar conversa
          </div>
        )
      }
    }
  }, [])

  // ✅ Render Resumo Semanal (formatado bonito)
  const renderResumoSemanal = useCallback((resumo: ResumosSemanais) => {
    if (!resumo.resumo_geral_semana || resumo.resumo_geral_semana.trim() === '') {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30 text-clinic-gray-500" />
          <p className="text-clinic-gray-400">Resumo semanal vazio ou sem conteúdo</p>
        </div>
      )
    }

    // Dividir o resumo em parágrafos
    const paragrafos = resumo.resumo_geral_semana.split('\n').filter(p => p.trim())

    return (
      <div className="p-4 space-y-4">
        {/* Header do Resumo */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CalendarDays className="h-5 w-5 mr-2 text-purple-400" />
            <span className="text-purple-300 font-medium">Período da Semana</span>
          </div>
          <p className="text-clinic-white text-lg font-semibold">
            {formatDate(resumo.data_inicio_semana)} — {formatDate(resumo.data_fim_semana)}
          </p>
          <p className="text-clinic-gray-400 text-sm mt-1">
            Gerado em: {formatDate(resumo.data_geracao)}
          </p>
        </div>

        {/* Conteúdo do Resumo */}
        <div className="bg-clinic-gray-800 rounded-lg p-4">
          <h4 className="text-clinic-cyan font-medium mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Resumo Geral da Semana
          </h4>
          <div className="space-y-3 text-clinic-gray-200 text-sm leading-relaxed">
            {paragrafos.map((paragrafo, index) => (
              <p key={index} className="whitespace-pre-wrap">
                {paragrafo}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }, [formatDate])

  // ============ LOADING STATES ============
  if (authLoading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // ✅ REMOVIDO check de !initialized - o conteúdo renderiza e os hooks carregam dados independentemente

  return (
    <div className="min-h-screen bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        <HeaderUniversal 
          titulo="Dashboard IA - Paciente" 
          descricao="Acompanhe as interações dos pacientes com a Agente IA"
          icone={Bot}
          showNovaClinicaModal={() => setShowNovaClinicaModal(true)}
        />

        {/* Navegação entre dashboards */}
        <div className="mb-6">
          <div className="bg-clinic-gray-800 rounded-lg p-1 inline-flex">
            <nav className="flex space-x-1">
              <button
                onClick={() => router.push('/dashboard/marketing')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                Marketing e Terapêutico
              </button>
              <button className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-clinic-cyan text-clinic-cyan">
                IA - Paciente
              </button>
              <button
                onClick={() => router.push('/dashboard/vendas')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                Comercial
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
            
            {/* ✅ COMPONENTE COM PACIENTES QUE TÊM RESUMOS */}
            <BuscaPacienteDropdown
              onSelectPaciente={handleSelectPaciente}
              selectedPaciente={selectedPaciente}
              pacientesList={pacientesComResumos}
              placeholder={loadingPacientes ? "Carregando pacientes..." : "Buscar paciente com resumo..."}
              className="mb-6"
            />
            
            {/* Indicador de pacientes disponíveis */}
            {!loadingPacientes && (
              <p className="text-xs text-clinic-gray-500 -mt-4 mb-4">
                {pacientesComResumos.length} paciente{pacientesComResumos.length !== 1 ? 's' : ''} com resumos disponíveis
              </p>
            )}

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
                  <p className="text-clinic-white font-mono">{formatCPF(selectedPaciente.cpf)}</p>
                </div>
              </div>
            )}

            {/* Toggle Diário/Semanal */}
            {selectedPaciente && (resumosDiarios.length > 0 || resumosSemanais.length > 0) && (
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => {
                    setViewMode('diario')
                    setSelectedResumoSemanal(null)
                  }}
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
                  onClick={() => {
                    setViewMode('semanal')
                    setConversaDia(null)
                    setSelectedDate('')
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'semanal'
                      ? 'bg-purple-600 text-white'
                      : 'bg-clinic-gray-800 text-clinic-gray-400 hover:bg-clinic-gray-700'
                  }`}
                >
                  <CalendarDays className="h-4 w-4 inline mr-1" />
                  Semanal ({resumosSemanais.length})
                </button>
              </div>
            )}

            {/* Loading de resumos */}
            {resumosLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
                <p className="text-clinic-gray-400 text-sm">Carregando resumos...</p>
              </div>
            )}

            {/* Timeline Diária */}
            {!resumosLoading && viewMode === 'diario' && resumosDiarios.length > 0 && (
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
                      <div className="font-medium">{formatDate(resumo.data_resumo)}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {resumo.resumo_interacoes ? `${resumo.resumo_interacoes.length} chars` : 'Sem conversa'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Timeline Semanal - AGORA CLICÁVEL */}
            {!resumosLoading && viewMode === 'semanal' && resumosSemanais.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-clinic-white mb-3 flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-purple-400" />
                  Resumos Semanais
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {resumosSemanais.map((resumo: ResumosSemanais) => (
                    <div
                      key={`semanal-${resumo.id_resumo_sem}`}
                      onClick={() => handleSelectResumoSemanal(resumo)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 text-sm ${
                        selectedResumoSemanal?.id_resumo_sem === resumo.id_resumo_sem
                          ? 'bg-purple-600 text-white'
                          : 'bg-clinic-gray-800 text-clinic-gray-300 hover:bg-clinic-gray-700'
                      }`}
                    >
                      <div className="font-medium">
                        {formatDate(resumo.data_inicio_semana)} - {formatDate(resumo.data_fim_semana)}
                      </div>
                      <div className="text-xs opacity-75 mt-1 line-clamp-2">
                        {resumo.resumo_geral_semana?.substring(0, 80) || 'Sem resumo'}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem quando não tem resumos */}
            {!resumosLoading && selectedPaciente && resumosDiarios.length === 0 && resumosSemanais.length === 0 && (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 text-clinic-gray-500 opacity-50" />
                <p className="text-clinic-gray-400 text-sm">Nenhum resumo encontrado para este paciente</p>
              </div>
            )}
          </Card>

          {/* Colunas 2 e 3: Área de Visualização */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-clinic-white flex items-center">
                {viewMode === 'diario' ? (
                  <>
                    <MessageCircle className="h-5 w-5 mr-2 text-cyan-400" />
                    Conversa do dia {selectedDate ? formatDate(selectedDate) : ''}
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-5 w-5 mr-2 text-purple-400" />
                    Resumo Semanal
                  </>
                )}
              </h2>
              
              {selectedPaciente && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400">Agente IA Online</span>
                </div>
              )}
            </div>

            {/* Área de Conteúdo */}
            <div className="bg-clinic-gray-900 rounded-lg h-96 overflow-y-auto">
              {/* Loading */}
              {loadingConversa && (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mr-3"></div>
                  <span className="ml-2 text-clinic-gray-400">Carregando...</span>
                </div>
              )}
              
              {/* ✅ MODO DIÁRIO - Conversa */}
              {!loadingConversa && viewMode === 'diario' && conversaDia && (
                renderConversa(conversaDia.resumo_interacoes)
              )}
              
              {/* ✅ MODO SEMANAL - Resumo */}
              {!loadingConversa && viewMode === 'semanal' && selectedResumoSemanal && (
                renderResumoSemanal(selectedResumoSemanal)
              )}
              
              {/* Placeholder - Diário sem seleção */}
              {!loadingConversa && viewMode === 'diario' && !conversaDia && selectedPaciente && (
                <div className="flex items-center justify-center h-full text-clinic-gray-400">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecione uma data para ver a conversa</p>
                  </div>
                </div>
              )}
              
              {/* Placeholder - Semanal sem seleção */}
              {!loadingConversa && viewMode === 'semanal' && !selectedResumoSemanal && selectedPaciente && (
                <div className="flex items-center justify-center h-full text-clinic-gray-400">
                  <div className="text-center">
                    <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecione uma semana para ver o resumo</p>
                  </div>
                </div>
              )}
              
              {/* Placeholder - Sem paciente */}
              {!loadingConversa && !selectedPaciente && (
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

        <NovaClinicaModal
          isOpen={showNovaClinicaModal}
          onClose={() => setShowNovaClinicaModal(false)}
          onSuccess={() => setShowNovaClinicaModal(false)}
        />
      </div>
    </div>
  )
}