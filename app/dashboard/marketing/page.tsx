'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Calendar,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react'
import { Button, Card, Select } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface OrigemLeadStats {
  origem: string
  total: number
  percentual: number
}

interface DashboardAgregado {
  tipo_agregado: string
  dados_agregados: any
  data_referencia: string
}

interface ResumoSemanal {
  semana: string
  data: string
}

export default function DashboardMarketingPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados dos dados
  const [origemLeadStats, setOrigemLeadStats] = useState<OrigemLeadStats[]>([])
  const [topicosMarketing, setTopicosMarketing] = useState<any>(null)
  const [oportunidadesConteudo, setOportunidadesConteudo] = useState<string[]>([])
  
  // Estados de seleção
  const [resumosSemanais, setResumosSemanais] = useState<ResumoSemanal[]>([])
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([])
  const [semanaSelected, setSemanaSelected] = useState('')
  const [diaSelected, setDiaSelected] = useState('')
  const [conversaResumo, setConversaResumo] = useState('')
  const [resumoSemana, setResumoSemana] = useState('')

  // Verificar autenticação
  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (!userData) {
      router.push('/login')
      return
    }
    
    try {
      const user = JSON.parse(userData) as Usuario
      if (user.role !== 'admin') {
        router.push('/estoque')
        return
      }
      setCurrentUser(user)
    } catch {
      router.push('/login')
    }
  }, [router])

  // Carregar dados do dashboard
  useEffect(() => {
    if (currentUser) {
      loadMarketingData()
    }
  }, [currentUser])

  const loadMarketingData = async () => {
    try {
      setLoading(true)
      
      // 1. Fonte de usuários por origem do lead
      await loadOrigemLeadStats()
      
      // 2. Tópicos de marketing do dashboard_agregados
      await loadTopicosMarketing()
      
      // 3. Oportunidades de conteúdo
      await loadOportunidadesConteudo()
      
      // 4. Resumos semanais e dias disponíveis
      await loadResumosSemanaisesDias()
      
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
      const stats: OrigemLeadStats[] = Object.entries(origemCount).map(([origem, count]) => ({
        origem,
        total: count,
        percentual: Math.round((count / total) * 100)
      })).sort((a, b) => b.total - a.total)
      
      setOrigemLeadStats(stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas de origem:', error)
    }
  }

  const loadTopicosMarketing = async () => {
    try {
      // Buscar últimos dados agregados de marketing
      const { data, error } = await supabaseApi.supabase
        .from('dashboard_agregados')
        .select('*')
        .ilike('tipo_agregado', '%MARKETING%')
        .order('data_geracao', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setTopicosMarketing(data[0].dados_agregados)
      }
    } catch (error) {
      console.error('Erro ao carregar tópicos de marketing:', error)
    }
  }

  const loadOportunidadesConteudo = async () => {
    try {
      // Buscar dados agregados de oportunidades
      const { data, error } = await supabaseApi.supabase
        .from('dashboard_agregados')
        .select('*')
        .ilike('tipo_agregado', '%OPORTUNIDADES%')
        .order('data_geracao', { ascending: false })
        .limit(5)
      
      if (error) throw error
      
      const oportunidades = data?.map(item => 
        typeof item.dados_agregados === 'string' 
          ? item.dados_agregados 
          : JSON.stringify(item.dados_agregados)
      ) || []
      
      setOportunidadesConteudo(oportunidades)
    } catch (error) {
      console.error('Erro ao carregar oportunidades de conteúdo:', error)
      // Fallback com dados mockados
      setOportunidadesConteudo([
        'Criar conteúdo sobre tendências de skincare',
        'Tutorial de aplicação de botox',
        'Comparativo de tratamentos faciais',
        'Dicas de cuidados pós-procedimento',
        'Stories sobre resultados reais'
      ])
    }
  }

  const loadResumosSemanaisesDias = async () => {
    try {
      // Buscar resumos semanais
      const { data: resumosData, error: resumosError } = await supabaseApi.supabase
        .from('dashboard_agregados')
        .select('*')
        .ilike('tipo_agregado', '%RESUMO%SEMANAL%')
        .order('data_referencia', { ascending: false })
        .limit(10)
      
      if (resumosError) throw resumosError
      
      const resumos: ResumoSemanal[] = resumosData?.map(item => ({
        semana: `Semana ${item.data_referencia}`,
        data: item.data_referencia
      })) || []
      
      // Fallback se não houver dados
      if (resumos.length === 0) {
        resumos.push(
          { semana: 'Semana 03/09/2025', data: '2025-09-03' },
          { semana: 'Semana 27/08/2025', data: '2025-08-27' },
          { semana: 'Semana 20/08/2025', data: '2025-08-20' }
        )
      }
      
      setResumosSemanais(resumos)
      
      // Dias disponíveis (mockado baseado nos dados históricos)
      setDiasDisponiveis(['31/08/2024', '05/07/2024', '22/06/2024', '15/06/2024'])
      
    } catch (error) {
      console.error('Erro ao carregar resumos:', error)
    }
  }

  const handleSemanaChange = async (semana: string) => {
    setSemanaSelected(semana)
    
    // Buscar resumo da semana selecionada
    try {
      const { data, error } = await supabaseApi.supabase
        .from('dashboard_agregados')
        .select('*')
        .eq('data_referencia', semana)
        .ilike('tipo_agregado', '%RESUMO%SEMANAL%')
        .single()
      
      if (error) throw error
      
      const resumo = typeof data.dados_agregados === 'string' 
        ? data.dados_agregados 
        : JSON.stringify(data.dados_agregados, null, 2)
      
      setResumoSemana(resumo)
    } catch (error) {
      console.error('Erro ao buscar resumo da semana:', error)
      setResumoSemana(`Resumo da semana ${semana}: Dados não disponíveis no momento.`)
    }
  }

  const handleDiaChange = async (dia: string) => {
    setDiaSelected(dia)
    
    // Buscar conversa do dia selecionado
    try {
      const { data, error } = await supabaseApi.supabase
        .from('dashboard_agregados')
        .select('*')
        .eq('data_referencia', dia)
        .ilike('tipo_agregado', '%RESUMO%DIARIO%')
        .single()
      
      if (error) throw error
      
      const conversa = typeof data.dados_agregados === 'string' 
        ? data.dados_agregados 
        : JSON.stringify(data.dados_agregados, null, 2)
      
      setConversaResumo(conversa)
    } catch (error) {
      console.error('Erro ao buscar conversa do dia:', error)
      setConversaResumo(`Conversa do dia ${dia}: Dados não disponíveis no momento.`)
    }
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
        </header>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Fonte de Usuários */}
          <Card title="Fonte de Usuários" className="md:col-span-1">
            <div className="space-y-3">
              {origemLeadStats.map((stat, index) => (
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
              ))}
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
                <div className="space-y-2">
                  <div className="p-2 bg-clinic-gray-700 rounded">Skincare trends 2025</div>
                  <div className="p-2 bg-clinic-gray-700 rounded">Botox preventivo</div>
                  <div className="p-2 bg-clinic-gray-700 rounded">Harmonização facial</div>
                </div>
              )}
            </div>
          </Card>

          {/* Oportunidades de Conteúdo */}
          <Card title="Oportunidades Conteúdo" className="md:col-span-1">
            <div className="space-y-2">
              {oportunidadesConteudo.slice(0, 5).map((oportunidade, index) => (
                <div key={index} className="p-2 bg-clinic-gray-700 rounded-lg text-clinic-white text-sm">
                  {oportunidade}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Seção de Seleção e Análise */}
        <Card title="Análise Detalhada" className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Seleção */}
            <div className="space-y-4">
              <div>
                <h3 className="text-clinic-white font-semibold mb-2">Selecionar Usuário</h3>
                
                <Select
                  label="Resumo Semanal"
                  value={semanaSelected}
                  onChange={(e) => handleSemanaChange(e.target.value)}
                  options={[
                    { value: '', label: 'Selecione uma semana...' },
                    ...resumosSemanais.map(resumo => ({
                      value: resumo.data,
                      label: resumo.semana
                    }))
                  ]}
                />
              </div>

              <Select
                label="Dias"
                value={diaSelected}
                onChange={(e) => handleDiaChange(e.target.value)}
                options={[
                  { value: '', label: 'Selecione um dia...' },
                  ...diasDisponiveis.map(dia => ({
                    value: dia,
                    label: dia
                  }))
                ]}
              />
            </div>

            {/* Conversa do Dia */}
            <div className="lg:col-span-2">
              <h3 className="text-clinic-white font-semibold mb-2">
                Conversa entre usuário e agente da tabela Resumo Diário
              </h3>
              <div className="bg-clinic-gray-700 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                <div className="text-clinic-gray-300 text-sm whitespace-pre-wrap">
                  {conversaResumo || 'Selecione um dia para ver a conversa correspondente.'}
                </div>
              </div>
            </div>

            {/* Resumo da Semana */}
            <div>
              <h3 className="text-clinic-white font-semibold mb-2">
                Resumo da Semana correspondente ao dia selecionado
              </h3>
              <div className="bg-clinic-gray-700 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                <div className="text-clinic-gray-300 text-sm whitespace-pre-wrap">
                  {resumoSemana || 'Selecione uma semana para ver o resumo correspondente.'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}