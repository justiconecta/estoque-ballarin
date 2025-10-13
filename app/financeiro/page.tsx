'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { DollarSign } from 'lucide-react'
import { HeaderUniversal, Button } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import type { Servico, Despesa, Profissional, Parametros, Venda, ServicoCalculado } from '@/types/database'

// ============ CONSTANTES ============
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const ANOS_DISPONIVEIS = Array.from({ length: 11 }, (_, i) => 2025 + i)
const FERIADOS_2025 = ['2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25']

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`

// ============ COMPONENTE CARD CUSTOMIZADO ============
const FinanceCard = ({ title, value, variant = 'default' }: { title: string; value: string | number; variant?: 'cyan' | 'green' | 'red' | 'default' }) => {
  const colors = {
    cyan: 'bg-clinic-cyan/10 border-clinic-cyan/30',
    green: 'bg-green-500/10 border-green-500/30',
    red: 'bg-red-500/10 border-red-500/30',
    default: 'bg-clinic-gray-700/50 border-clinic-gray-600'
  }
  return (
    <div className={`${colors[variant]} border rounded-lg p-4`}>
      <p className="text-xs text-clinic-gray-400 mb-1">{title}</p>
      <p className="text-xl font-bold text-clinic-white">{value}</p>
    </div>
  )
}

const calcularDiasUteis = (ano: number, mes: number) => {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  let diasUteis = 0
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes - 1, dia)
    const diaSemana = data.getDay()
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_2025.includes(dataStr)) diasUteis++
  }
  return diasUteis
}

const calcularDiaUtilAtual = (ano: number, mes: number) => {
  const hoje = new Date()
  if (hoje.getFullYear() !== ano || hoje.getMonth() + 1 !== mes) return 0
  let diaUtilAtual = 0
  for (let dia = 1; dia <= hoje.getDate(); dia++) {
    const data = new Date(ano, mes - 1, dia)
    const diaSemana = data.getDay()
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_2025.includes(dataStr)) diaUtilAtual++
  }
  return diaUtilAtual
}

// ============ COMPONENTE PRINCIPAL ============
export default function FinanceiroPage() {
  const [abaAtiva, setAbaAtiva] = useState('servicos')
  const [anoSelecionado, setAnoSelecionado] = useState(2025)
  const [mesesSelecionados, setMesesSelecionados] = useState([new Date().getMonth() + 1])
  const [loading, setLoading] = useState(false)

  // Estados de dados
  const [servicos, setServicos] = useState<Servico[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [parametros, setParametros] = useState<Parametros | null>(null)
  const [vendas, setVendas] = useState<any[]>([])

  // Estados de formulários
  const [mostrarFormServico, setMostrarFormServico] = useState(false)
  const [novoServico, setNovoServico] = useState({ nome: '', preco: 0, custo_insumos: 0 })
  const [mostrarFormDespesa, setMostrarFormDespesa] = useState(false)
  const [novaDespesa, setNovaDespesa] = useState({ categoria: 'Infraestrutura', item: '', valor: 0 })
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', horasSemanais: 40 })

  // Carregar dados
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (['vendas', 'metas', 'controle', 'dre'].includes(abaAtiva)) {
      loadVendas()
    }
  }, [abaAtiva, anoSelecionado, mesesSelecionados])

  const loadData = async () => {
    try {
      setLoading(true)
      const [servicosData, despesasData, profissionaisData, parametrosData] = await Promise.all([
        supabaseApi.getServicos(),
        supabaseApi.getDespesas(),
        supabaseApi.getProfissionais(),
        supabaseApi.getParametros()
      ])
      setServicos(servicosData)
      setDespesas(despesasData)
      setProfissionais(profissionaisData)
      setParametros(parametrosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVendas = async () => {
    try {
      const vendasData = await supabaseApi.getVendas(anoSelecionado, mesesSelecionados)
      setVendas(vendasData)
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    }
  }

  // Handlers
  const handleAdicionarServico = async () => {
    if (!novoServico.nome || novoServico.preco <= 0) return
    try {
      await supabaseApi.createServico(novoServico)
      setNovoServico({ nome: '', preco: 0, custo_insumos: 0 })
      setMostrarFormServico(false)
      loadData()
    } catch (error) {
      console.error('Erro ao criar serviço:', error)
    }
  }

  const handleAdicionarDespesa = async () => {
    if (!novaDespesa.item || novaDespesa.valor <= 0) return
    try {
      await supabaseApi.createDespesa({ categoria: novaDespesa.categoria, item: novaDespesa.item, valor_mensal: novaDespesa.valor })
      setNovaDespesa({ categoria: 'Infraestrutura', item: '', valor: 0 })
      setMostrarFormDespesa(false)
      loadData()
    } catch (error) {
      console.error('Erro ao criar despesa:', error)
    }
  }

  const handleAdicionarProfissional = async () => {
    if (!novoProfissional.nome || novoProfissional.horasSemanais <= 0) return
    try {
      await supabaseApi.createProfissional({ nome: novoProfissional.nome, horas_semanais: novoProfissional.horasSemanais })
      setNovoProfissional({ nome: '', horasSemanais: 40 })
      loadData()
    } catch (error) {
      console.error('Erro ao criar profissional:', error)
    }
  }

  const handleRemoverProfissional = async (id: number) => {
    try {
      await supabaseApi.deleteProfissional(id)
      loadData()
    } catch (error) {
      console.error('Erro ao remover profissional:', error)
    }
  }

  const handleUpdateParametros = async (updates: Partial<Parametros>) => {
    try {
      await supabaseApi.updateParametros(updates)
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar parâmetros:', error)
    }
  }

  const handleMesToggle = useCallback((mes: number) => {
    setMesesSelecionados(prev => {
      const jaSelecionado = prev.includes(mes)
      if (jaSelecionado) {
        return prev.length === 1 ? prev : prev.filter(m => m !== mes)
      }
      return [...prev, mes].sort((a, b) => a - b)
    })
  }, [])

  // Cálculos
  const diasUteisTotais = useMemo(() => 
    mesesSelecionados.reduce((total, mes) => total + calcularDiasUteis(anoSelecionado, mes), 0),
    [anoSelecionado, mesesSelecionados]
  )

  const diaUtilAtual = useMemo(() => 
    mesesSelecionados.reduce((total, mes) => total + calcularDiaUtilAtual(anoSelecionado, mes), 0),
    [anoSelecionado, mesesSelecionados]
  )

  const servicosCalculados: ServicoCalculado[] = useMemo(() => 
    servicos.map(s => ({
      ...s,
      margemContribuicao: s.preco - s.custo_insumos - s.custo_equip,
      margemContribuicaoPct: s.preco > 0 ? ((s.preco - s.custo_insumos - s.custo_equip) / s.preco) * 100 : 0
    })),
    [servicos]
  )

  const totalDespesasFixas = useMemo(() => 
    despesas.reduce((sum, d) => sum + d.valor_mensal, 0),
    [despesas]
  )

  const despesasFixasPeriodo = useMemo(() => 
    totalDespesasFixas * mesesSelecionados.length,
    [totalDespesasFixas, mesesSelecionados]
  )

  const parametrosCalculados = useMemo(() => {
    if (!parametros) return null
    
    const totalHorasSemanais = profissionais.reduce((sum, p) => sum + p.horas_semanais, 0)
    const horasDaEquipe = (totalHorasSemanais / 5) * diasUteisTotais
    const horasDasSalas = parametros.numero_salas * parametros.horas_trabalho_dia * diasUteisTotais
    const horasProdutivasPotenciais = Math.min(horasDaEquipe, horasDasSalas)
    
    const totalServicosVendidos = vendas.reduce((sum, v) => sum + (v.servicos?.length || 0), 0)
    const horasOcupadas = totalServicosVendidos * parametros.duracao_media_servico_horas
    
    const custoHora = horasProdutivasPotenciais > 0 ? despesasFixasPeriodo / horasProdutivasPotenciais : 0
    const taxaOcupacao = horasProdutivasPotenciais > 0 ? (horasOcupadas / horasProdutivasPotenciais) * 100 : 0
    const custoOciosidade = (horasProdutivasPotenciais - horasOcupadas) * custoHora

    return { horasDaEquipe, horasDasSalas, horasProdutivasPotenciais, custoHora, horasOcupadas, taxaOcupacao, custoOciosidade }
  }, [parametros, profissionais, diasUteisTotais, despesasFixasPeriodo, vendas])

  const dre = useMemo(() => {
    if (!parametros) return null
    
    const faturamentoBruto = vendas.reduce((sum, v) => sum + v.preco_total, 0)
    const impostos = faturamentoBruto * (parametros.aliquota_impostos_pct / 100)
    const taxasFinanceiras = vendas.reduce((sum, v) => sum + v.custo_taxa_cartao, 0)
    const faturamentoLiquido = faturamentoBruto - impostos - taxasFinanceiras
    const custosVariaveis = vendas.reduce((sum, v) => sum + (v.custo_total - v.custo_taxa_cartao), 0)
    const lucroBruto = faturamentoLiquido - custosVariaveis
    const resultadoOperacional = lucroBruto - despesasFixasPeriodo

    return { faturamentoBruto, impostos, taxasFinanceiras, faturamentoLiquido, custosVariaveis, lucroBruto, despesasFixas: despesasFixasPeriodo, resultadoOperacional }
  }, [vendas, parametros, despesasFixasPeriodo])

  const tituloPeriodo = useMemo(() => {
    if (mesesSelecionados.length === 1) return `${MESES[mesesSelecionados[0]-1]} ${anoSelecionado}`
    return `${mesesSelecionados.map(m => MESES[m-1]).join(', ')} / ${anoSelecionado}`
  }, [mesesSelecionados, anoSelecionado])

  const abas = [
    { id: 'servicos', label: 'Serviços' },
    { id: 'parametros', label: 'Parâmetros' },
    { id: 'despesas', label: 'Despesas' },
    { id: 'vendas', label: 'Vendas' },
    { id: 'metas', label: 'Metas' },
    { id: 'controle', label: 'Controle' },
    { id: 'dre', label: 'DRE' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Carregando dashboard financeiro...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        <HeaderUniversal 
          titulo="Dashboard Financeiro" 
          descricao="Gestão completa de receitas, despesas e indicadores"
          icone={DollarSign}
        />

        <nav className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {abas.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm ${
                abaAtiva === aba.id
                  ? 'bg-gradient-to-r from-clinic-cyan to-blue-500 text-white shadow-lg'
                  : 'bg-clinic-gray-800/50 text-clinic-cyan hover:bg-clinic-gray-700/50 border border-clinic-cyan/20'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {['vendas', 'metas', 'controle', 'dre'].includes(abaAtiva) && (
            <FiltroPeriodo 
              ano={anoSelecionado}
              setAno={setAnoSelecionado}
              mesesSelecionados={mesesSelecionados}
              onMesToggle={handleMesToggle}
            />
          )}

          {abaAtiva === 'servicos' && (
            <AbaServicos 
              servicos={servicosCalculados}
              mostrarForm={mostrarFormServico}
              setMostrarForm={setMostrarFormServico}
              novoServico={novoServico}
              setNovoServico={setNovoServico}
              onAdicionar={handleAdicionarServico}
            />
          )}

          {abaAtiva === 'parametros' && parametros && parametrosCalculados && (
            <AbaParametros 
              parametros={parametros}
              calculados={parametrosCalculados}
              onUpdate={handleUpdateParametros}
              profissionais={profissionais}
              novoProfissional={novoProfissional}
              setNovoProfissional={setNovoProfissional}
              onAdicionarProfissional={handleAdicionarProfissional}
              onRemoverProfissional={handleRemoverProfissional}
            />
          )}

          {abaAtiva === 'despesas' && (
            <AbaDespesas 
              despesas={despesas}
              total={totalDespesasFixas}
              mostrarForm={mostrarFormDespesa}
              setMostrarForm={setMostrarFormDespesa}
              novaDespesa={novaDespesa}
              setNovaDespesa={setNovaDespesa}
              onAdicionar={handleAdicionarDespesa}
            />
          )}

          {abaAtiva === 'vendas' && (
            <AbaVendas vendas={vendas} tituloPeriodo={tituloPeriodo} />
          )}

          {abaAtiva === 'dre' && dre && parametrosCalculados && (
            <AbaDRE dre={dre} tituloPeriodo={tituloPeriodo} parametros={parametrosCalculados} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============ SUBCOMPONENTES ============

const FiltroPeriodo = ({ ano, setAno, mesesSelecionados, onMesToggle }: any) => (
  <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div>
        <label className="text-sm font-semibold text-clinic-gray-400 mb-2 block">Ano</label>
        <select 
          value={ano} 
          onChange={(e) => setAno(Number(e.target.value))}
          className="w-full bg-clinic-gray-700 border border-clinic-cyan/30 rounded-lg px-4 py-2 text-clinic-cyan"
        >
          {ANOS_DISPONIVEIS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="text-sm font-semibold text-clinic-gray-400 mb-2 block">Meses</label>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
          {MESES.map((nome, index) => {
            const mesNumero = index + 1
            const isSelected = mesesSelecionados.includes(mesNumero)
            return (
              <button
                key={mesNumero}
                onClick={() => onMesToggle(mesNumero)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-clinic-cyan to-blue-500 text-white'
                    : 'bg-clinic-gray-700 text-clinic-gray-400 hover:bg-clinic-gray-600'
                }`}
              >
                {nome}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  </div>
)

const Input = ({ label, type = 'text', value, onChange, placeholder = '' }: any) => (
  <div>
    <label className="text-sm text-clinic-gray-400 mb-2 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder}
      className="w-full bg-clinic-gray-700 border border-clinic-cyan/30 rounded-lg px-4 py-2 text-clinic-white"
    />
  </div>
)

const AbaServicos = ({ servicos, mostrarForm, setMostrarForm, novoServico, setNovoServico, onAdicionar }: any) => (
  <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-clinic-cyan">Catálogo de Serviços</h2>
      <Button onClick={() => setMostrarForm(!mostrarForm)}>
        {mostrarForm ? '✕ Cancelar' : '+ Novo Serviço'}
      </Button>
    </div>

    {mostrarForm && (
      <div className="bg-clinic-cyan/10 border border-clinic-cyan/30 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-clinic-cyan mb-4">Adicionar Novo Serviço</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input label="Nome do Serviço" value={novoServico.nome} onChange={(v: string) => setNovoServico({...novoServico, nome: v})} />
          <Input label="Preço" type="number" value={novoServico.preco} onChange={(v: number) => setNovoServico({...novoServico, preco: v})} />
          <Input label="Custo Insumos" type="number" value={novoServico.custo_insumos} onChange={(v: number) => setNovoServico({...novoServico, custo_insumos: v})} />
        </div>
        <Button onClick={onAdicionar}>Salvar Serviço</Button>
      </div>
    )}

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-clinic-cyan/20">
            <th className="px-4 py-3 text-left text-clinic-cyan">Serviço</th>
            <th className="px-4 py-3 text-right text-clinic-cyan">Preço</th>
            <th className="px-4 py-3 text-right text-clinic-cyan">Custo Insumos</th>
            <th className="px-4 py-3 text-right text-clinic-cyan">Margem</th>
            <th className="px-4 py-3 text-right text-clinic-cyan">%</th>
          </tr>
        </thead>
        <tbody>
          {servicos.map((s: ServicoCalculado) => (
            <tr key={s.id} className="border-b border-clinic-cyan/10 hover:bg-clinic-cyan/5">
              <td className="px-4 py-3 text-clinic-white">{s.nome}</td>
              <td className="px-4 py-3 text-right text-clinic-cyan">{formatCurrency(s.preco)}</td>
              <td className="px-4 py-3 text-right text-clinic-gray-400">{formatCurrency(s.custo_insumos)}</td>
              <td className="px-4 py-3 text-right text-green-400 font-bold">{formatCurrency(s.margemContribuicao)}</td>
              <td className="px-4 py-3 text-right text-green-400 font-bold">{formatPercent(s.margemContribuicaoPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const AbaParametros = ({ parametros, calculados, onUpdate, profissionais, novoProfissional, setNovoProfissional, onAdicionarProfissional, onRemoverProfissional }: any) => (
  <div className="space-y-6">
    <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
      <h2 className="text-2xl font-bold text-clinic-cyan mb-6">Parâmetros Dinâmicos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Input label="Nº de Salas" type="number" value={parametros.numero_salas} 
          onChange={(v: number) => onUpdate({ numero_salas: v })} />
        <Input label="Horas Trabalho/Dia" type="number" value={parametros.horas_trabalho_dia} 
          onChange={(v: number) => onUpdate({ horas_trabalho_dia: v })} />
        <Input label="Duração Serviço (h)" type="number" value={parametros.duracao_media_servico_horas} 
          onChange={(v: number) => onUpdate({ duracao_media_servico_horas: v })} />
        <Input label="MOD Padrão" type="number" value={parametros.mod_padrao} 
          onChange={(v: number) => onUpdate({ mod_padrao: v })} />
      </div>
    </div>

    <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
      <h2 className="text-2xl font-bold text-clinic-cyan mb-6">Equipe de Profissionais</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-clinic-cyan/20 rounded-lg">
        <Input label="Nome" value={novoProfissional.nome} onChange={(v: string) => setNovoProfissional({...novoProfissional, nome: v})} />
        <Input label="Horas Semanais" type="number" value={novoProfissional.horasSemanais} onChange={(v: number) => setNovoProfissional({...novoProfissional, horasSemanais: v})} />
        <Button onClick={onAdicionarProfissional} className="self-end">Adicionar</Button>
      </div>
      <div className="space-y-2">
        {profissionais.map((p: Profissional) => (
          <div key={p.id} className="flex justify-between items-center bg-clinic-gray-700/50 p-3 rounded-lg">
            <span className="font-semibold text-clinic-white">{p.nome}</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-clinic-gray-400">{p.horas_semanais}h/semana</span>
              <button onClick={() => onRemoverProfissional(p.id)} className="text-red-400 hover:text-red-300 text-xs">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {calculados && (
      <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
        <h2 className="text-2xl font-bold text-clinic-cyan mb-6">Indicadores de Produtividade</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinanceCard title="Horas Equipe" value={`${calculados.horasDaEquipe.toFixed(0)}h`} />
          <FinanceCard title="Horas Salas" value={`${calculados.horasDasSalas}h`} />
          <FinanceCard title="Custo Hora" value={formatCurrency(calculados.custoHora)} />
          <FinanceCard title="Taxa Ocupação" value={formatPercent(calculados.taxaOcupacao)} />
        </div>
      </div>
    )}
  </div>
)

const AbaDespesas = ({ despesas, total, mostrarForm, setMostrarForm, novaDespesa, setNovaDespesa, onAdicionar }: any) => (
  <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-clinic-cyan">Despesas Fixas Mensais</h2>
      <Button onClick={() => setMostrarForm(!mostrarForm)}>
        {mostrarForm ? '✕ Cancelar' : '+ Nova Despesa'}
      </Button>
    </div>

    {mostrarForm && (
      <div className="bg-clinic-cyan/10 border border-clinic-cyan/30 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm text-clinic-gray-400 mb-2 block">Categoria</label>
            <select value={novaDespesa.categoria} onChange={(e) => setNovaDespesa({...novaDespesa, categoria: e.target.value})}
              className="w-full bg-clinic-gray-700 border border-clinic-cyan/30 rounded-lg px-4 py-2 text-clinic-white">
              <option>Infraestrutura</option>
              <option>Pessoal</option>
              <option>Administrativo</option>
              <option>Marketing</option>
            </select>
          </div>
          <Input label="Item" value={novaDespesa.item} onChange={(v: string) => setNovaDespesa({...novaDespesa, item: v})} />
          <Input label="Valor" type="number" value={novaDespesa.valor} onChange={(v: number) => setNovaDespesa({...novaDespesa, valor: v})} />
        </div>
        <Button onClick={onAdicionar}>Salvar Despesa</Button>
      </div>
    )}

    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-clinic-cyan/20">
          <th className="px-4 py-3 text-left text-clinic-cyan">Categoria</th>
          <th className="px-4 py-3 text-left text-clinic-cyan">Item</th>
          <th className="px-4 py-3 text-right text-clinic-cyan">Valor</th>
        </tr>
      </thead>
      <tbody>
        {despesas.map((d: Despesa) => (
          <tr key={d.id} className="border-b border-clinic-cyan/10">
            <td className="px-4 py-3 text-clinic-white">{d.categoria}</td>
            <td className="px-4 py-3 text-clinic-gray-400">{d.item}</td>
            <td className="px-4 py-3 text-right text-clinic-cyan">{formatCurrency(d.valor_mensal)}</td>
          </tr>
        ))}
        <tr className="bg-clinic-cyan/10 font-bold">
          <td colSpan={2} className="px-4 py-3 text-clinic-cyan">TOTAL</td>
          <td className="px-4 py-3 text-right text-clinic-cyan">{formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
)

const AbaVendas = ({ vendas, tituloPeriodo }: any) => (
  <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
    <h2 className="text-2xl font-bold text-clinic-cyan mb-4">Vendas - {tituloPeriodo}</h2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-clinic-cyan/20">
            <th className="px-4 py-3 text-left text-clinic-cyan">Data</th>
            <th className="px-4 py-3 text-left text-clinic-cyan">Paciente</th>
            <th className="px-4 py-3 text-left text-clinic-cyan">Pagamento</th>
            <th className="px-4 py-3 text-right text-clinic-cyan">Total</th>
            <th className="px-4 py-3 text-right text-clinic-cyan">Margem</th>
          </tr>
        </thead>
        <tbody>
          {vendas.map((v: any) => (
            <tr key={v.id} className="border-b border-clinic-cyan/10">
              <td className="px-4 py-3 text-clinic-white">{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
              <td className="px-4 py-3 text-clinic-white">{v.pacientes?.nome_completo || 'N/A'}</td>
              <td className="px-4 py-3 text-clinic-gray-400">{v.metodo_pagamento}</td>
              <td className="px-4 py-3 text-right text-clinic-cyan font-bold">{formatCurrency(v.preco_total)}</td>
              <td className="px-4 py-3 text-right text-green-400 font-bold">{formatCurrency(v.margem_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const AbaDRE = ({ dre, tituloPeriodo, parametros }: any) => (
  <div className="space-y-6">
    <div className="bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-clinic-cyan/20 p-6">
      <h2 className="text-2xl font-bold text-clinic-cyan mb-6">DRE - {tituloPeriodo}</h2>
      <div className="space-y-4">
        <DRELine label="(+) Faturamento Bruto" value={dre.faturamentoBruto} isMain />
        <DRELine label="(-) Impostos" value={dre.impostos} isNegative />
        <DRELine label="(-) Taxas Financeiras" value={dre.taxasFinanceiras} isNegative />
        <DRELine label="(=) Faturamento Líquido" value={dre.faturamentoLiquido} isMain />
        <DRELine label="(-) Custos Variáveis" value={dre.custosVariaveis} isNegative />
        <DRELine label="(=) Lucro Bruto" value={dre.lucroBruto} isSubTotal />
        <DRELine label="(-) Despesas Fixas" value={dre.despesasFixas} isNegative />
        <DRELine label="(=) RESULTADO OPERACIONAL" value={dre.resultadoOperacional} isFinal />
      </div>
    </div>
  </div>
)

const DRELine = ({ label, value, isMain, isNegative, isSubTotal, isFinal }: any) => {
  let classes = "flex justify-between py-3"
  let valueClasses = "text-lg"
  
  if (isMain) {
    classes += " border-b-2 border-clinic-cyan"
    valueClasses = "text-xl font-bold text-clinic-cyan"
  }
  if (isNegative) valueClasses += " text-red-400"
  if (isSubTotal) {
    classes += " bg-green-500/10 px-4 rounded border-b-2 border-green-500"
    valueClasses = `text-xl font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`
  }
  if (isFinal) {
    classes += ` px-4 rounded ${value >= 0 ? 'bg-green-500/10 border-b-4 border-green-500' : 'bg-red-500/10 border-b-4 border-red-500'}`
    valueClasses = `text-2xl font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`
  }
  
  return (
    <div className={classes}>
      <span className={`font-semibold text-clinic-white ${isFinal ? 'text-lg' : ''}`}>{label}</span>
      <p className={valueClasses}>{formatCurrency(value)}</p>
    </div>
  )
}