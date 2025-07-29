'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Heart, AlertTriangle, Package, LogOut } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface StatsData {
  totalPacientes: number
  pacientesAtivos: number
  consultasRealizadas: number
  pacientesMaisAtivos: Array<{
    nome: string
    ultimaInteracao: string
    resumosDiarios: number
  }>
  efeitosAdversos: Array<{
    efeito: string
    relatos: number
  }>
  fatoresSucesso: Array<{
    fator: string
    score: number
    descricao: string
  }>
  pontosMelhoria: Array<{
    ponto: string
    impacto: string
    sugestao: string
  }>
  satisfacaoGeral: number
  reviewsPositivos: number
  reviewsNegativos: number
}

export default function DashboardTerapeuticoPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData>({
    totalPacientes: 0,
    pacientesAtivos: 0,
    consultasRealizadas: 0,
    pacientesMaisAtivos: [],
    efeitosAdversos: [],
    fatoresSucesso: [],
    pontosMelhoria: [],
    satisfacaoGeral: 0,
    reviewsPositivos: 0,
    reviewsNegativos: 0
  })

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
      
      // Carregar dados base
      const [pacientes, consultas, procedimentos, reviews] = await Promise.all([
        supabaseApi.getPacientes(1000),
        supabaseApi.getConsultas ? supabaseApi.getConsultas(500) : [],
        supabaseApi.getProcedimentos(500),
        supabaseApi.getGoogleReviews(100)
      ])

      // Estatísticas básicas
      const totalPacientes = pacientes.length
      const consultasRealizadas = procedimentos.filter(p => p.status_procedimento === 'Concluido').length
      
      // Pacientes ativos (baseado em consultas recentes)
      const pacientesComConsultas = pacientes.filter(paciente => {
        return procedimentos.some(proc => proc.id_orcamento === paciente.id_paciente)
      })
      const pacientesAtivos = pacientesComConsultas.length

      // Rankings de pacientes mais ativos
      const pacientesMaisAtivos = pacientesComConsultas
        .map(paciente => {
          const procedimentosPaciente = procedimentos.filter(p => p.id_orcamento === paciente.id_paciente)
          const ultimaInteracao = procedimentosPaciente.length > 0 
            ? new Date(Math.max(...procedimentosPaciente.map(p => new Date(p.data_realizacao || '').getTime()))).toLocaleDateString('pt-BR')
            : 'N/A'
          
          return {
            nome: paciente.nome,
            ultimaInteracao,
            resumosDiarios: procedimentosPaciente.length
          }
        })
        .sort((a, b) => b.resumosDiarios - a.resumosDiarios)
        .slice(0, 10)

      // Análise de efeitos adversos baseado em observações dos procedimentos
      const efeitosMap: Record<string, number> = {}
      procedimentos.forEach(proc => {
        if (proc.observacoes) {
          const observacao = proc.observacoes.toLowerCase()
          // Buscar palavras-chave relacionadas a efeitos adversos
          const palavrasChave = ['dor', 'inchaço', 'vermelhidão', 'irritação', 'desconforto', 'reação', 'alergia', 'sensibilidade']
          palavrasChave.forEach(palavra => {
            if (observacao.includes(palavra)) {
              efeitosMap[palavra] = (efeitosMap[palavra] || 0) + 1
            }
          })
        }
      })
      
      const efeitosAdversos = Object.entries(efeitosMap)
        .map(([efeito, relatos]) => ({ efeito, relatos }))
        .sort((a, b) => b.relatos - a.relatos)
        .slice(0, 10)

      // Análise de satisfação baseada em reviews
      const reviewsPositivos = reviews.filter(r => r.nota >= 4).length
      const reviewsNegativos = reviews.filter(r => r.nota <= 2).length
      const satisfacaoGeral = reviews.length > 0 
        ? Math.round((reviews.reduce((sum, r) => sum + r.nota, 0) / reviews.length) * 20) // Convertendo para escala 0-100
        : 0

      // Fatores de sucesso baseados em reviews positivos
      const comentariosPositivos = reviews.filter(r => r.nota >= 4).map(r => r.comentario).join(' ').toLowerCase()
      const fatoresSucesso = [
        { 
          fator: 'Atendimento Profissional', 
          score: comentariosPositivos.includes('profissional') ? 95 : 85,
          descricao: 'Qualidade do atendimento profissional'
        },
        { 
          fator: 'Resultados Satisfatórios', 
          score: comentariosPositivos.includes('resultado') ? 90 : 80,
          descricao: 'Satisfação com os resultados obtidos'
        },
        { 
          fator: 'Ambiente Acolhedor', 
          score: comentariosPositivos.includes('ambiente') || comentariosPositivos.includes('lugar') ? 88 : 75,
          descricao: 'Qualidade do ambiente clínico'
        },
        { 
          fator: 'Pontualidade', 
          score: comentariosPositivos.includes('pontual') || comentariosPositivos.includes('horário') ? 87 : 70,
          descricao: 'Cumprimento de horários agendados'
        },
        { 
          fator: 'Comunicação Clara', 
          score: comentariosPositivos.includes('explicou') || comentariosPositivos.includes('informação') ? 85 : 72,
          descricao: 'Clareza na comunicação com pacientes'
        }
      ].sort((a, b) => b.score - a.score)

      // Pontos de melhoria baseados em reviews negativos
      const comentariosNegativos = reviews.filter(r => r.nota <= 2).map(r => r.comentario).join(' ').toLowerCase()
      const pontosMelhoria = [
        {
          ponto: 'Tempo de Espera',
          impacto: comentariosNegativos.includes('espera') || comentariosNegativos.includes('atraso') ? 'Alto' : 'Baixo',
          sugestao: 'Melhorar gestão de agenda e comunicação de atrasos'
        },
        {
          ponto: 'Processo de Agendamento',
          impacto: comentariosNegativos.includes('agendar') || comentariosNegativos.includes('marcar') ? 'Médio' : 'Baixo',
          sugestao: 'Simplificar processo de marcação de consultas'
        },
        {
          ponto: 'Informações sobre Preços',
          impacto: comentariosNegativos.includes('preço') || comentariosNegativos.includes('valor') ? 'Médio' : 'Baixo',
          sugestao: 'Maior transparência na comunicação de valores'
        },
        {
          ponto: 'Follow-up Pós-Tratamento',
          impacto: comentariosNegativos.includes('acompanhamento') || comentariosNegativos.includes('retorno') ? 'Alto' : 'Baixo',
          sugestao: 'Implementar protocolo de acompanhamento pós-procedimento'
        },
        {
          ponto: 'Disponibilidade de Horários',
          impacto: comentariosNegativos.includes('disponível') || comentariosNegativos.includes('horário') ? 'Médio' : 'Baixo',
          sugestao: 'Ampliar grade de horários disponíveis'
        }
      ].filter(p => p.impacto !== 'Baixo')

      setStats({
        totalPacientes,
        pacientesAtivos,
        consultasRealizadas,
        pacientesMaisAtivos,
        efeitosAdversos,
        fatoresSucesso,
        pontosMelhoria,
        satisfacaoGeral,
        reviewsPositivos,
        reviewsNegativos
      })

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard terapêutico:', error)
    } finally {
      setLoading(false)
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
              <h1 className="text-3xl font-bold text-clinic-white">Dashboard Acompanhamento Terapêutico</h1>
              <p className="text-clinic-gray-400 mt-1">
                Monitoramento da jornada e experiência dos pacientes
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
          <Card className="bg-gradient-to-br from-clinic-cyan/10 to-clinic-cyan/5 border-clinic-cyan/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Pacientes Cadastrados</p>
                <p className="text-3xl font-bold text-clinic-white">{stats.totalPacientes}</p>
                <p className="text-clinic-cyan text-sm mt-1">Total no sistema</p>
              </div>
              <Users className="h-12 w-12 text-clinic-cyan" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Pacientes Ativos</p>
                <p className="text-3xl font-bold text-clinic-white">{stats.pacientesAtivos}</p>
                <p className="text-green-400 text-sm mt-1">Com procedimentos</p>
              </div>
              <Heart className="h-12 w-12 text-green-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Consultas Realizadas</p>
                <p className="text-3xl font-bold text-clinic-white">{stats.consultasRealizadas}</p>
                <p className="text-blue-400 text-sm mt-1">Procedimentos concluídos</p>
              </div>
              <Users className="h-12 w-12 text-blue-400" />
            </div>
          </Card>
        </div>

        {/* Rankings e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card title="Top 10 - Pacientes Mais Ativos">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.pacientesMaisAtivos.length > 0 ? (
                stats.pacientesMaisAtivos.map((paciente, index) => (
                  <div key={paciente.nome} className="flex items-center justify-between p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-clinic-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-clinic-white font-medium">{paciente.nome}</p>
                        <p className="text-clinic-gray-400 text-sm">Última: {paciente.ultimaInteracao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-clinic-cyan font-bold">{paciente.resumosDiarios}</p>
                      <p className="text-clinic-gray-400 text-sm">procedimentos</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum paciente ativo encontrado</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Top 10 - Efeitos Adversos Relatados">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.efeitosAdversos.length > 0 ? (
                stats.efeitosAdversos.map((efeito, index) => (
                  <div key={efeito.efeito} className="flex items-center justify-between p-2 bg-clinic-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="text-clinic-gray-400 text-sm mr-2">{index + 1}.</span>
                      <span className="text-clinic-white text-sm capitalize">{efeito.efeito}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-red-400 font-medium mr-2">{efeito.relatos}</span>
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum efeito adverso relatado</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Dashboard CX */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-clinic-white mb-6 text-center">Dashboard CX</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Satisfação Geral */}
            <Card title="Satisfação Geral">
              <div className="text-center py-6">
                <div className="text-6xl font-bold text-clinic-cyan mb-2">
                  {stats.satisfacaoGeral}%
                </div>
                <p className="text-clinic-gray-400 mb-4">Índice de satisfação</p>
                <div className="flex justify-center space-x-4 text-sm">
                  <div className="text-green-400">
                    <span className="font-bold">{stats.reviewsPositivos}</span> positivos
                  </div>
                  <div className="text-red-400">
                    <span className="font-bold">{stats.reviewsNegativos}</span> negativos
                  </div>
                </div>
              </div>
            </Card>

            {/* Fatores de Sucesso */}
            <Card title="Top 5 - Fatores de Sucesso">
              <div className="space-y-3">
                {stats.fatoresSucesso.map((fator, index) => (
                  <div key={fator.fator} className="p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-clinic-white font-medium text-sm">{fator.fator}</span>
                      <span className="text-green-400 font-bold">{fator.score}</span>
                    </div>
                    <p className="text-clinic-gray-400 text-xs">{fator.descricao}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pontos de Melhoria */}
            <Card title="Pontos de Melhoria">
              <div className="space-y-3">
                {stats.pontosMelhoria.length > 0 ? (
                  stats.pontosMelhoria.map((ponto, index) => (
                    <div key={ponto.ponto} className="p-3 bg-clinic-gray-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-clinic-white font-medium text-sm">{ponto.ponto}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          ponto.impacto === 'Alto' ? 'bg-red-500/20 text-red-400' :
                          ponto.impacto === 'Médio' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {ponto.impacto}
                        </span>
                      </div>
                      <p className="text-clinic-gray-400 text-xs">{ponto.sugestao}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-clinic-gray-400">Nenhum ponto de melhoria identificado</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}