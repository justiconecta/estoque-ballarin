'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { Button, Card, HeaderUniversal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario, Paciente } from '@/types/database'

// ✅ INTERFACES CORRETAS COM NOMES DE COLUNAS EXATOS (CORRIGIDOS)
interface ResumosDiarios {
  id_resumo_diario: number       // ✅ CORRETO: id_resumo_diario (não id_resumo_di)
  cpf: string
  nome_paciente: string | null
  resumo_interacoes: string      // ✅ CORRETO: resumo_interacoes (não resumo_interacao)
  status_processamento: string
  data_resumo: string
  data_criacao: string
  id_clinica: number
}

interface ResumosSemanais {
  id_resumo_sem: number
  cpf: string
  nome_paciente: string | null
  data_inicio_semana: string
  data_fim_semana: string
  resumo_geral_semana: string
  data_geracao: string
  id_clinica: number
}

// ✅ COMPONENTE DROPDOWN - Mantido como estava funcionando
const BuscaPacienteDropdown: React.FC<{
  onSelectPaciente: (paciente: Paciente) => void
  selectedPaciente: Paciente | null
  className?: string
}> = ({ onSelectPaciente, selectedPaciente, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)

  const carregarPacientes = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔄 CARREGANDO PACIENTES PARA DROPDOWN...')
      
      const pacientesData = await supabaseApi.getPacientes()
      
      if (Array.isArray(pacientesData) && pacientesData.length > 0) {
        const pacientesOrdenados = pacientesData
          .filter(p => p.nome_completo)
          .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''))
        
        setPacientes(pacientesOrdenados)
        console.log(`✅ PACIENTES ORDENADOS PARA DROPDOWN: ${pacientesOrdenados.length}`)
      } else {
        setPacientes([])
      }
    } catch (error) {
      console.error('❌ ERRO ao carregar pacientes para dropdown:', error)
      setPacientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && pacientes.length === 0) {
      carregarPacientes()
    }
  }, [isOpen, pacientes.length, carregarPacientes])

  const pacientesFiltrados = pacientes.filter(paciente => {
    const termo = searchTerm.toLowerCase()
    const nome = (paciente.nome_completo || '').toLowerCase()
    const cpf = (paciente.cpf || '').replace(/\D/g, '')
    const termoCpf = termo.replace(/\D/g, '')
    
    return nome.includes(termo) || cpf.includes(termoCpf)
  })

  const formatCPF = (cpf: string) => {
    if (!cpf) return 'CPF não informado'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-clinic-gray-300 mb-2">
        Selecionar Paciente:
      </label>
      
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center w-full px-3 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-white focus-within:border-cyan-400 transition-all duration-200 hover:border-cyan-500">
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg shadow-xl">
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

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-clinic-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent mx-auto mb-2"></div>
                Carregando pacientes...
              </div>
            ) : pacientesFiltrados.length === 0 ? (
              <div className="p-4 text-center text-clinic-gray-400">
                {searchTerm ? `Nenhum paciente encontrado para "${searchTerm}"` : 
                 pacientes.length === 0 ? 'Nenhum paciente cadastrado' : 'Digite para buscar...'}
              </div>
            ) : (
              pacientesFiltrados.map((paciente) => (
                <div
                  key={`paciente-dropdown-${paciente.id_paciente}`}
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
  
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [resumosDiarios, setResumosDiarios] = useState<ResumosDiarios[]>([])
  const [resumosSemanais, setResumosSemanais] = useState<ResumosSemanais[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [conversaDia, setConversaDia] = useState<ResumosDiarios | null>(null)
  const [loadingConversa, setLoadingConversa] = useState(false)

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

  // ✅ CARREGAR RESUMOS - CORRIGIDO COM NOMES DE COLUNAS CORRETOS
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
      
      // ✅ LOGS COM NOMES DE COLUNAS CORRETOS
      console.log(`📋 RESUMOS DIÁRIOS DETALHADOS:`, diarios?.map(d => ({
        id: d.id_resumo_diario,           // ✅ CORRETO: id_resumo_diario
        data_resumo: d.data_resumo,
        data_criacao: d.data_criacao,
        tem_conversa: d.resumo_interacoes ? 'SIM' : 'NÃO', // ✅ CORRETO: resumo_interacoes
        tamanho: d.resumo_interacoes?.length || 0
      })) || [])
      
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
      
      if (conversa) {
        // ✅ LOGS COM COLUNA CORRIGIDA
        console.log(`✅ CONVERSA ENCONTRADA:`, {
          id: conversa.id_resumo_diario,                 // ✅ CORRETO: id_resumo_diario
          data: conversa.data_resumo,
          tem_conteudo: conversa.resumo_interacoes ? 'SIM' : 'NÃO', // ✅ CORRETO: resumo_interacoes
          tamanho: conversa.resumo_interacoes?.length || 0,
          preview: conversa.resumo_interacoes?.substring(0, 100) + '...'
        })
      }
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

  // ✅ RENDER CONVERSA - PARSER CORRIGIDO PARA SEPARAR PACIENTE E IA
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
      console.log('🎭 RENDERIZANDO CONVERSA:')
      console.log('📏 TAMANHO:', resumoInteracoes.length)
      console.log('🔍 PRIMEIROS 200 CHARS:', resumoInteracoes.substring(0, 200))
      
      // ✅ PARSER CORRIGIDO - Split inicial por **PACIENTE**
      let mensagens: Array<{speaker: string, texto: string}> = []
      
      // Split por **PACIENTE**: para separar os blocos de conversa
      const blocosPaciente = resumoInteracoes.split(/\*\*PACIENTE\*\*:?\s*/i).filter(bloco => bloco.trim())
      
      console.log('🔍 BLOCOS DE CONVERSA:', blocosPaciente.length)
      
      blocosPaciente.forEach((bloco, index) => {
        console.log(`📦 BLOCO ${index + 1}:`, bloco.substring(0, 100) + '...')
        
        // ✅ DENTRO DE CADA BLOCO: separar mensagem do paciente e resposta da IA
        // Padrão: [MENSAGEM_PACIENTE]**EVELYN IA**: [RESPOSTA_IA]
        const partesBloco = bloco.split(/\*\*(EVELYN|AGENTE|AGENT)\s*IA\*\*:?\s*/i)
        
        if (partesBloco.length >= 2) {
          // Primeira parte: mensagem do paciente
          const mensagemPaciente = partesBloco[0]?.trim()
          if (mensagemPaciente) {
            mensagens.push({
              speaker: 'PACIENTE',
              texto: mensagemPaciente
            })
            console.log(`👤 PACIENTE: ${mensagemPaciente.substring(0, 50)}...`)
          }
          
          // Segunda parte: resposta da IA
          const respostaIA = partesBloco[2]?.trim() || partesBloco[1]?.trim() // fallback para diferentes posições
          if (respostaIA) {
            mensagens.push({
              speaker: 'ALICE',
              texto: respostaIA
            })
            console.log(`🤖 ALICE: ${respostaIA.substring(0, 50)}...`)
          }
        } else {
          // Se não conseguiu dividir, pode ser só mensagem do paciente
          const textoLimpo = bloco.trim()
          if (textoLimpo) {
            mensagens.push({
              speaker: 'PACIENTE',
              texto: textoLimpo
            })
            console.log(`👤 PACIENTE (sem resposta): ${textoLimpo.substring(0, 50)}...`)
          }
        }
      })
      
      console.log(`✅ MENSAGENS EXTRAÍDAS: ${mensagens.length}`)
      mensagens.forEach((msg, i) => {
        console.log(`📨 MSG ${i+1} [${msg.speaker}]: ${msg.texto.substring(0, 60)}...`)
      })
      
      // Se não conseguiu extrair mensagens, tentar método alternativo
      if (mensagens.length === 0) {
        console.log('⚠️ MÉTODO PRINCIPAL FALHOU, TENTANDO FALLBACK...')
        
        // Fallback: split por qualquer **SPEAKER**
        const partes = resumoInteracoes.split(/\*\*(PACIENTE|EVELYN|AGENTE|AGENT|IA)\*\*:?\s*/gi)
        
        for (let i = 1; i < partes.length; i += 2) {
          const speaker = partes[i - 1]?.toUpperCase() || ''
          const texto = partes[i]?.trim() || ''
          
          if (texto) {
            const isPatient = speaker.includes('PACIENTE')
            mensagens.push({
              speaker: isPatient ? 'PACIENTE' : 'ALICE',
              texto: texto
            })
          }
        }
      }
      
      // Se ainda não conseguiu, mostrar raw
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
      
      // ✅ RENDER WHATSAPP-STYLE
      return (
        <div className="space-y-4 p-2">
          {mensagens.map((mensagem, index) => {
            const isPatient = mensagem.speaker === 'PACIENTE'
            
            return (
              <div 
                key={`msg-${index}-${mensagem.speaker}-${mensagem.texto.substring(0, 10)}`}
                className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-lg ${
                    isPatient 
                      ? 'bg-cyan-600 text-white rounded-br-sm' // Paciente: direita, azul
                      : 'bg-purple-600 text-white rounded-bl-sm' // Alice: esquerda, roxo
                  }`}
                >
                  {/* Header com nome do speaker */}
                  <div className={`text-xs font-semibold mb-1 opacity-90 ${
                    isPatient ? 'text-cyan-100' : 'text-purple-100'
                  }`}>
                    {mensagem.speaker}
                  </div>
                  
                  {/* Conteúdo da mensagem */}
                  <div className="text-sm leading-relaxed">
                    {mensagem.texto}
                  </div>
                  
                  {/* Timestamp simulado */}
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
          <div className="mt-2 text-xs text-clinic-gray-400">
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
          <div className="mt-4 bg-clinic-gray-800 p-2 rounded text-xs">
            Raw: {resumoInteracoes.substring(0, 500)}...
          </div>
        </div>
      )
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
        
        {/* ✅ HEADER UNIVERSAL - SUBSTITUÍDO */}
        <HeaderUniversal 
          titulo="Interações Paciente - IA" 
          descricao="Acompanhe todas as conversas entre pacientes e nossa assistente virtual ALICE"
          icone={Bot}
        />

        {/* ✅ NAVEGAÇÃO POR TABS */}
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
          <Card className="bg-clinic-gray-800 border-clinic-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
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

            {/* ✅ TIMELINE COM COLUNA CORRIGIDA */}
            {resumosDiarios.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                  Dias com Interação ({resumosDiarios.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {resumosDiarios.map((resumo) => (
                    <div
                      key={`timeline-${resumo.id_resumo_diario}-${resumo.data_resumo}`} // ✅ COLUNA CORRIGIDA
                      onClick={() => handleSelectDate(resumo.data_resumo)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 text-center text-sm font-medium ${
                        selectedDate === resumo.data_resumo
                          ? 'bg-cyan-600 text-white'
                          : 'bg-clinic-gray-900 text-clinic-gray-300 hover:bg-clinic-gray-700'
                      }`}
                    >
                      <div className="font-medium">
                        {formatDate(resumo.data_resumo)}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {resumo.resumo_interacoes ? // ✅ COLUNA CORRIGIDA
                          `${resumo.resumo_interacoes.length} chars` : 
                          'Sem conversa'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Colunas 2 e 3: Conversa do Dia - LAYOUT WHATSAPP */}
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

            {/* ✅ ÁREA DA CONVERSA - WHATSAPP STYLE */}
            <div className="bg-clinic-gray-900 rounded-lg h-96 overflow-y-auto">
              {loadingConversa ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent mr-3"></div>
                  <span className="ml-2 text-clinic-gray-400">Carregando conversa...</span>
                </div>
              ) : conversaDia ? (
                renderConversa(conversaDia.resumo_interacoes) // ✅ COLUNA CORRIGIDA
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
