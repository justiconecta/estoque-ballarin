'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LogOut, 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Home,
  Calendar,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Package
} from 'lucide-react'
import { Button, Input, Select, Card, Modal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario, Paciente, Consulta } from '@/types/database'

interface PacienteForm {
  nome: string
  cpf: string
  data_nascimento: string
  sexo: string
  telefone: string
  email: string
  origem_lead: string
}

const pacienteFormInitial: PacienteForm = {
  nome: '',
  cpf: '',
  data_nascimento: '',
  sexo: '',
  telefone: '',
  email: '',
  origem_lead: ''
}

export default function PacientesPage() {
  const router = useRouter()
  
  // Estados principais
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados de modal/form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete'>('create')
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [pacienteForm, setPacienteForm] = useState<PacienteForm>(pacienteFormInitial)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  
  // Estados de feedback
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean
    type: 'success' | 'error'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
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

  // Carregar pacientes
  useEffect(() => {
    if (currentUser) {
      loadPacientes()
    }
  }, [currentUser])

  const loadPacientes = async () => {
    try {
      setLoading(true)
      const data = await supabaseApi.getPacientes()
      setPacientes(data)
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao carregar pacientes')
      console.error('Erro ao carregar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadPacientes()
      return
    }
    
    try {
      setLoading(true)
      const data = await supabaseApi.searchPacientes(searchTerm)
      setPacientes(data)
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha na pesquisa')
      console.error('Erro na pesquisa:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (type: 'create' | 'edit' | 'view' | 'delete', paciente?: Paciente) => {
    setModalType(type)
    setSelectedPaciente(paciente || null)
    
    if (type === 'edit' && paciente) {
      setPacienteForm({
        nome: paciente.nome,
        cpf: paciente.cpf,
        data_nascimento: paciente.data_nascimento.split('T')[0],
        sexo: paciente.sexo,
        telefone: paciente.telefone,
        email: paciente.email,
        origem_lead: paciente.origem_lead
      })
    } else if (type === 'create') {
      setPacienteForm(pacienteFormInitial)
    }
    
    if (type === 'view' && paciente) {
      loadConsultasPaciente(paciente.id_paciente)
    }
    
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPaciente(null)
    setPacienteForm(pacienteFormInitial)
    setConsultas([])
  }

  const loadConsultasPaciente = async (pacienteId: number) => {
    try {
      const data = await supabaseApi.getConsultasByPaciente(pacienteId)
      setConsultas(data)
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pacienteForm.nome || !pacienteForm.cpf || !pacienteForm.email) {
      showFeedback('error', 'Erro de Validação', 'Preencha todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      
      if (modalType === 'create') {
        await supabaseApi.createPaciente(pacienteForm)
        showFeedback('success', 'Sucesso!', 'Paciente cadastrado com sucesso')
      } else if (modalType === 'edit' && selectedPaciente) {
        await supabaseApi.updatePaciente(selectedPaciente.id_paciente, pacienteForm)
        showFeedback('success', 'Sucesso!', 'Paciente atualizado com sucesso')
      }
      
      closeModal()
      loadPacientes()
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao salvar paciente')
      console.error('Erro ao salvar paciente:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPaciente) return
    
    try {
      setLoading(true)
      await supabaseApi.deletePaciente(selectedPaciente.id_paciente)
      showFeedback('success', 'Sucesso!', 'Paciente removido com sucesso')
      closeModal()
      loadPacientes()
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao remover paciente')
      console.error('Erro ao deletar paciente:', error)
    } finally {
      setLoading(false)
    }
  }

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedbackModal({ isOpen: true, type, title, message })
  }

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatTelefone = (telefone: string) => {
    return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  if (!currentUser) {
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
              onClick={() => router.back()} 
              icon={ArrowLeft}
              size="sm"
            >
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-clinic-white">Gestão de Pacientes</h1>
              <p className="text-clinic-gray-400 mt-1">
                Usuário: <span className="font-semibold text-clinic-cyan">{currentUser.nome_completo}</span>
                <span className="text-xs ml-2 text-clinic-gray-500">({currentUser.role})</span>
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {currentUser.role === 'admin' && (
              <>
                <Button variant="secondary" onClick={() => router.push('/dashboard')} icon={Home} size="sm">
                  Dashboard
                </Button>
                <Button variant="secondary" onClick={() => router.push('/estoque')} icon={Package} size="sm">
                  Estoque
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={handleLogout} icon={LogOut} size="sm">
              Sair
            </Button>
          </div>
        </header>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Pesquisar por nome, CPF, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} icon={Search} size="sm">
              Buscar
            </Button>
          </div>
          <Button onClick={() => openModal('create')} icon={UserPlus}>
            Novo Paciente
          </Button>
        </div>

        {/* Lista de Pacientes */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-clinic-gray-400">Carregando pacientes...</span>
            </div>
          ) : pacientes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
              <p className="text-clinic-gray-400">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-clinic-gray-700">
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">CPF</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Telefone</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Origem</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Cadastro</th>
                    <th className="text-center py-3 px-4 text-clinic-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((paciente) => (
                    <tr key={paciente.id_paciente} className="border-b border-clinic-gray-800 hover:bg-clinic-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-clinic-white">{paciente.nome}</div>
                        <div className="text-sm text-clinic-gray-400">{paciente.email}</div>
                      </td>
                      <td className="py-3 px-4 text-clinic-gray-300">{formatCPF(paciente.cpf)}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{formatTelefone(paciente.telefone)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          paciente.origem_lead === 'Instagram' ? 'bg-pink-900/20 text-pink-400' :
                          paciente.origem_lead === 'Google' ? 'bg-blue-900/20 text-blue-400' :
                          'bg-green-900/20 text-green-400'
                        }`}>
                          {paciente.origem_lead}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-clinic-gray-300">
                        {new Date(paciente.data_cadastro).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openModal('view', paciente)}
                            icon={Eye}
                          >
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openModal('edit', paciente)}
                            icon={Edit}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openModal('delete', paciente)}
                            icon={Trash2}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal CRUD */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          modalType === 'create' ? 'Novo Paciente' :
          modalType === 'edit' ? 'Editar Paciente' :
          modalType === 'view' ? 'Detalhes do Paciente' :
          'Confirmar Exclusão'
        }
      >
        {modalType === 'view' && selectedPaciente ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Nome</label>
                <p className="text-clinic-white">{selectedPaciente.nome}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">CPF</label>
                <p className="text-clinic-white">{formatCPF(selectedPaciente.cpf)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Data de Nascimento</label>
                <p className="text-clinic-white">{new Date(selectedPaciente.data_nascimento).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Sexo</label>
                <p className="text-clinic-white">{selectedPaciente.sexo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Telefone</label>
                <p className="text-clinic-white">{formatTelefone(selectedPaciente.telefone)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Email</label>
                <p className="text-clinic-white">{selectedPaciente.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Origem do Lead</label>
                <p className="text-clinic-white">{selectedPaciente.origem_lead}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-clinic-gray-400 mb-1">Data de Cadastro</label>
                <p className="text-clinic-white">{new Date(selectedPaciente.data_cadastro).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            
            <div className="border-t border-clinic-gray-700 pt-4">
              <h4 className="text-lg font-medium text-clinic-white mb-3">Histórico de Consultas</h4>
              {consultas.length === 0 ? (
                <p className="text-clinic-gray-400 text-center py-4">Nenhuma consulta registrada</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {consultas.map((consulta) => (
                    <div key={consulta.id_consulta} className="flex justify-between items-center p-3 bg-clinic-gray-900 rounded-lg">
                      <div>
                        <p className="text-clinic-white font-medium">{consulta.tipo_consulta}</p>
                        <p className="text-clinic-gray-400 text-sm">
                          {new Date(consulta.data_agendamento).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        consulta.status_consulta === 'Realizada' ? 'bg-green-900/20 text-green-400' :
                        consulta.status_consulta === 'Agendada' ? 'bg-blue-900/20 text-blue-400' :
                        'bg-red-900/20 text-red-400'
                      }`}>
                        {consulta.status_consulta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : modalType === 'delete' && selectedPaciente ? (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-600 mb-4">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <p className="text-clinic-gray-300 mb-4">
              Tem certeza que deseja excluir o paciente <strong>{selectedPaciente.nome}</strong>?
            </p>
            <p className="text-clinic-gray-400 text-sm mb-6">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-3 justify-center">
              <Button variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={loading}>
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome *"
                value={pacienteForm.nome}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
              <Input
                label="CPF *"
                value={pacienteForm.cpf}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                placeholder="00000000000"
                maxLength={11}
                required
              />
              <Input
                label="Data de Nascimento *"
                type="date"
                value={pacienteForm.data_nascimento}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, data_nascimento: e.target.value }))}
                required
              />
              <Select
                label="Sexo *"
                value={pacienteForm.sexo}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, sexo: e.target.value }))}
                options={[
                  { value: '', label: 'Selecione...' },
                  { value: 'Masculino', label: 'Masculino' },
                  { value: 'Feminino', label: 'Feminino' },
                  { value: 'Outro', label: 'Outro' }
                ]}
                required
              />
              <Input
                label="Telefone *"
                value={pacienteForm.telefone}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, '') }))}
                placeholder="11999999999"
                maxLength={11}
                required
              />
              <Input
                label="Email *"
                type="email"
                value={pacienteForm.email}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <Select
              label="Origem do Lead *"
              value={pacienteForm.origem_lead}
              onChange={(e) => setPacienteForm(prev => ({ ...prev, origem_lead: e.target.value }))}
              options={[
                { value: '', label: 'Selecione...' },
                { value: 'Instagram', label: 'Instagram' },
                { value: 'Google', label: 'Google' },
                { value: 'Indicação', label: 'Indicação' },
                { value: 'Whatsapp', label: 'WhatsApp' },
                { value: 'Facebook', label: 'Facebook' },
                { value: 'Site', label: 'Site' }
              ]}
              required
            />
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                {modalType === 'create' ? 'Cadastrar' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Feedback */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
      >
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
            feedbackModal.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {feedbackModal.type === 'success' ? (
              <Users className="h-6 w-6 text-white" />
            ) : (
              <User className="h-6 w-6 text-white" />
            )}
          </div>
          <p className="text-clinic-gray-300 mb-4">{feedbackModal.message}</p>
          <Button onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}>
            OK
          </Button>
        </div>
      </Modal>
    </div>
  )
}