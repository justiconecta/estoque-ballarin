'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Package, LogOut, Heart } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface OrigemLeadStats {
  origem: string
  total: number
  percentual: number
}

export default function DashboardMarketingPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados de dados reais
  const [origemLeadStats, setOrigemLeadStats] = useState<OrigemLeadStats[]>([])
  const [topicosMarketing, setTopicosMarketing] = useState<any>(null)
  const [oportunidadesConteudo, setOportunidadesConteudo] = useState<any[]>([])
  const [resumosDisponiveis, setResumosDisponiveis] = useState<string[]>([])
  const [conversaResumo, setConversaResumo] = useState<string>('')

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
    }
  }, [router])

  // Carregar dados do dashboard
  useEffect(() => {
    if (currentUser) {
      loadDashboardData()
    }
  }, [currentUser])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      await Promise.all([
        loadOrigemLeadStats(),
        loadTopicosMarketing(),
        loadOportunidadesConteudo(),
        loadResumosSemanaisesDias()
      ])
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard marketing:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrigemLeadStats = async () => {
    try {
      const pacientes = await supabaseApi.getPacientes(1000)
      
      // Contar por origem do lead
      const origemCount: Record<string, number> = {}
      pacientes.forEach(paciente => {
        const origem = paciente.origem_lead || 'Não informado'
        origemCount[origem] = (origemCount[origem] || 0) + 1
      })
      
      const total = pacientes.length
      if (total === 0) {
        setOrigemLeadStats([])
        return
      }
      
      const stats: OrigemLeadStats[] = Object.entries(origemCount).map(([origem, count]) => ({
        origem,
        total: count,
        percentual: Math.round((count / total) * 100)
      })).sort((a, b) => b.total - a.total)
      
      setOrigemLeadStats(stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas de origem:', error)
      setOrigemLeadStats([])
    }
  }

  const loadTopicosMarketing = async () => {
    try {
      const dados = await supabaseApi.getDashboardAgregadoByTipo('MARKETING')
      setTopicosMarketing(dados?.dados_agregados || null)
    } catch (error) {
      console.error('Erro ao carregar tópicos de marketing:', error)
      setTopicosMarketing(null)
    }
  }

  const loadOportunidadesConteudo = async () => {
    try {
      const dados = await supabaseApi.getDashboardAgregados('OPORTUNIDADES', 5)
      const oportunidades = dados?.map(item => 
        typeof item.dados_agregados === 'string' 
          ? item.dados_agregados 
          : JSON.stringify(item.dados_agregados)
      ) || []
      
      setOportunidadesConteudo(oportunidades)
    } catch (error) {
      console.error('Erro ao carregar oportunidades de conteúdo:', error)
      setOportunidadesConteudo([])
    }
  }

  const loadResumosSemanaisesDias = async () => {
    try {
      const dados = await supabaseApi.getDashboardAgregados('RESUMO', 10)
      const diasDisponiveis = dados?.map(item => 
        new Date(item.data_referencia || item.data_geracao).toLocaleDateString('pt-BR')
      ).filter((dia, index, arr) => arr.indexOf(dia) === index) || []
      
      setResumosDisponiveis(diasDisponiveis)
    } catch (error) {
      console.error('Erro ao carregar resumos disponíveis:', error)
      setResumosDisponiveis([])
    }
  }

  const buscarConversaDoDia = async (dia: string) => {
    try {
      const dataFormatada = new Date(dia.split('/').reverse().join('-')).toISOString().split('T')[0]
      
      const dados = await supabaseApi.getDashboardAgregados('RESUMO')
      const conversaDoDia = dados?.find(item => 
        item.data_referencia?.includes(dataFormatada) || 
        item.data_geracao.includes(dataFormatada)
      )
      
      const conversa = conversaDoDia?.dados_agregados 
        ? typeof conversaDoDia.dados_agregados === 'string' 
          ? conversaDoDia.dados_agregados 
          : JSON.stringify(conversaDoDia.dados_agregados, null, 2)
        : `Nenhum resumo disponível para ${dia}`
      
      setConversaResumo(conversa)
    } catch (error) {
      console.error('Erro ao buscar conversa do dia:', error)
      setConversaResumo(`Erro ao carregar dados para ${dia}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-clinic-gray-700">
          <div className="flex items-center space-x-4">
            <Button 
              variant="secondary" 
              onClick={() => router.push('/dashboard')} 
              icon={ArrowLeft}
              size="sm"
            >
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-clinic-white">Dashboard Marketing</h1>
              <p className="text-clinic-gray-400 mt-1">
                Análise de performance e oportunidades de marketing
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={() => router.push('/estoque')} icon={Package} size="sm">
              Estoque
            </Button>
            <Button variant="secondary" onClick={() => router.push('/pacientes')} icon={Users} size="sm">
              Pacientes
            </Button>
            <Button variant="secondary" onClick={handleLogout} icon={LogOut} size="sm">
              Sair
            </Button>
          </div>
        </header>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Fonte de Usuários */}
          <Card title="Fonte de Usuários" className="md:col-span-1">
            <div className="space-y-3">
              {origemLeadStats.length > 0 ? (
                origemLeadStats.map((stat, index) => (
                  <div key={stat.origem} className="flex justify-between items-center p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        index === 0 ? 'bg-clinic-cyan' :
                        index === 1 ? 'bg-green-400' :
                        index === 2 ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`} />
                      <span className="text-clinic-white font-medium">{stat.origem}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-clinic-cyan font-bold">{stat.total}</div>
                      <div className="text-clinic-gray-400 text-sm">{stat.percentual}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum dado de origem disponível</p>
                </div>
              )}
            </div>
          </Card>

          {/* Tópicos Marketing */}
          <Card title="Tópicos Marketing do Mês" className="md:col-span-1">
            <div className="text-clinic-gray-300">
              {topicosMarketing ? (
                <pre className="text-sm whitespace-pre-wrap">
                  {typeof topicosMarketing === 'string' 
                    ? topicosMarketing 
                    : JSON.stringify(topicosMarketing, null, 2)
                  }
                </pre>
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum tópico de marketing disponível</p>
                </div>
              )}
            </div>
          </Card>

          {/* Oportunidades de Conteúdo */}
          <Card title="Oportunidades de Conteúdo" className="md:col-span-1">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {oportunidadesConteudo.length > 0 ? (
                oportunidadesConteudo.map((oportunidade, index) => (
                  <div key={index} className="p-3 bg-clinic-gray-700 rounded-lg">
                    <p className="text-clinic-gray-300 text-sm">
                      {oportunidade.length > 150 
                        ? `${oportunidade.substring(0, 150)}...` 
                        : oportunidade
                      }
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhuma oportunidade de conteúdo disponível</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Resumos e Conversas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dias Disponíveis */}
          <Card title="Resumos Disponíveis">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {resumosDisponiveis.length > 0 ? (
                resumosDisponiveis.map((dia, index) => (
                  <button
                    key={index}
                    onClick={() => buscarConversaDoDia(dia)}
                    className="w-full text-left p-3 bg-clinic-gray-700 hover:bg-clinic-gray-600 rounded-lg transition-colors"
                  >
                    <span className="text-clinic-white">{dia}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum resumo disponível</p>
                </div>
              )}
            </div>
          </Card>

          {/* Conversa do Dia */}
          <Card title="Resumo Selecionado">
            <div className="bg-clinic-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto">
              {conversaResumo ? (
                <pre className="text-clinic-gray-300 text-sm whitespace-pre-wrap">
                  {conversaResumo}
                </pre>
              ) : (
                <p className="text-clinic-gray-400">
                  Selecione um dia para ver o resumo
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}