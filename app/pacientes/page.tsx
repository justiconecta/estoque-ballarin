'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Phone,
  Mail,
  User,
  Save,
  X
} from 'lucide-react'
import { Button, Input, Select, Card, Modal, HeaderUniversal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario, Paciente } from '@/types/database'
import NovaClinicaModal from '@/components/NovaClinicaModal'

// ✅ INTERFACE CORRIGIDA - TODOS os campos com nomes reais da tabela
interface PacienteForm {
  nome_completo: string      // ✅ CORRIGIDO: era 'nome'
  cpf: string
  data_nascimento: string
  genero: string             // ✅ MANTIDO: correto
  celular: string            // ✅ MANTIDO: correto
  email: string
  origem_lead: string
  endereco_completo: string  // ✅ MANTIDO: correto
  status_paciente: string    // ✅ MANTIDO: correto
}

// ✅ FORM INICIAL CORRIGIDO
const pacienteFormInitial: PacienteForm = {
  nome_completo: '',         // ✅ CORRIGIDO
  cpf: '',
  data_nascimento: '',
  genero: '',               
  celular: '',             
  email: '',
  origem_lead: '',
  endereco_completo: '',   
  status_paciente: 'Ativo'
}

export default function PacientesPage() {
  const router = useRouter()
  
  // Estados principais
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // ✅ ESTADO MODAL NOVA CLÍNICA
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  
  // Estados de modal/form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete'>('create')
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [pacienteForm, setPacienteForm] = useState<PacienteForm>(pacienteFormInitial)
  const [submitting, setSubmitting] = useState(false)
  
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

  // Carregar dados iniciais
  useEffect(() => {
    // Os dados serão carregados apenas se o usuário estiver autenticado (validado pelo HeaderUniversal)
    const userData = localStorage.getItem('ballarin_user')
    if (userData) {
      loadPacientes()
    }
  }, [])

  const loadPacientes = async () => {
    try {
      setLoading(true)
      console.log('📋 Carregando pacientes...')
      const data = await supabaseApi.getPacientes()
      console.log('📊 Dados recebidos:', data)
      setPacientes(data)
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao carregar pacientes')
      console.error('Erro ao carregar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ FUNÇÃO DE BUSCA CORRIGIDA - Campo nome_completo
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      loadPacientes()
      return
    }
    
    const filteredPacientes = pacientes.filter(paciente =>
      paciente.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||  // ✅ CORRIGIDO
      paciente.cpf?.includes(searchTerm) ||
      paciente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.celular?.includes(searchTerm) ||
      (paciente.endereco_completo && paciente.endereco_completo.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setPacientes(filteredPacientes)
  }

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedbackModal({ isOpen: true, type, title, message })
  }

  // ✅ CALLBACK PARA ABRIR MODAL NOVA CLÍNICA
  const handleShowNovaClinicaModal = () => {
    setShowNovaClinicaModal(true)
  }

  // ✅ HANDLER APÓS CRIAR CLÍNICA
  const handleClinicaCriada = async () => {
    // Recarregar dados após criar clínica se necessário
    setShowNovaClinicaModal(false)
  }

  // ✅ MAPEAMENTO MODAL CORRIGIDO - Campo nome_completo
  const openModal = (type: 'create' | 'edit' | 'view' | 'delete', paciente?: Paciente) => {
    setModalType(type)
    setSelectedPaciente(paciente || null)
    
    if (type === 'edit' && paciente) {
      setPacienteForm({
        nome_completo: paciente.nome_completo || '',      // ✅ CORRIGIDO
        cpf: paciente.cpf || '',
        data_nascimento: paciente.data_nascimento || '',
        genero: paciente.genero || '',                  
        celular: paciente.celular || '',                
        email: paciente.email || '',
        origem_lead: paciente.origem_lead || '',
        endereco_completo: paciente.endereco_completo || '',
        status_paciente: paciente.status_paciente || 'Ativo'
      })
    } else if (type === 'create') {
      setPacienteForm(pacienteFormInitial)
    }
    
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPaciente(null)
    setPacienteForm(pacienteFormInitial)
    setSubmitting(false)
  }

  // CRIAR PACIENTE
  const handleCreatePaciente = async () => {
    if (!pacienteForm.nome_completo || !pacienteForm.cpf) {  // ✅ CORRIGIDO
      showFeedback('error', 'Erro de Validação', 'Nome completo e CPF são obrigatórios')
      return
    }

    try {
      setSubmitting(true)
      await supabaseApi.createPaciente({
        ...pacienteForm,
        termo_aceite_dados: true  // Valor padrão
      })
      
      showFeedback('success', 'Sucesso', 'Paciente cadastrado com sucesso!')
      closeModal()
      loadPacientes()
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao cadastrar paciente')
      console.error('Erro ao criar paciente:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // EDITAR PACIENTE
  const handleUpdatePaciente = async () => {
    if (!selectedPaciente) return

    if (!pacienteForm.nome_completo || !pacienteForm.cpf) {  // ✅ CORRIGIDO
      showFeedback('error', 'Erro de Validação', 'Nome completo e CPF são obrigatórios')
      return
    }

    try {
      setSubmitting(true)
      await supabaseApi.updatePaciente(selectedPaciente.id_paciente, pacienteForm)
      
      showFeedback('success', 'Sucesso', 'Paciente atualizado com sucesso!')
      closeModal()
      loadPacientes()
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao atualizar paciente')
      console.error('Erro ao atualizar paciente:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ FUNÇÃO DELETAR REMOVIDA - Método não existe no supabaseApi
  // Em vez de deletar, vamos inativar o paciente
  const handleInactivatePaciente = async () => {
    if (!selectedPaciente) return

    try {
      setSubmitting(true)
      await supabaseApi.updatePaciente(selectedPaciente.id_paciente, {
        status_paciente: 'Inativo'
      })
      
      showFeedback('success', 'Sucesso', 'Paciente inativado com sucesso!')
      closeModal()
      loadPacientes()
    } catch (error) {
      showFeedback('error', 'Erro', 'Falha ao inativar paciente')
      console.error('Erro ao inativar paciente:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // SUBMIT PRINCIPAL
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (modalType === 'create') {
      handleCreatePaciente()
    } else if (modalType === 'edit') {
      handleUpdatePaciente()
    }
  }

  return (
    <div className="min-h-screen bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        
        {/* ✅ HEADER UNIVERSAL - COM CALLBACK NOVA CLÍNICA */}
        <HeaderUniversal 
          titulo="Gestão de Pacientes" 
          descricao="Cadastro e acompanhamento de pacientes da sua clínica"
          icone={Users}
          showNovaClinicaModal={handleShowNovaClinicaModal}
        />

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Pesquisar por nome, CPF, email ou celular..."  
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
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent" />
              <span className="ml-2 text-clinic-gray-400">Carregando pacientes...</span>
            </div>
          ) : pacientes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
              <p className="text-clinic-gray-400">
                {searchTerm ? 'Nenhum paciente encontrado com os critérios de busca' : 'Nenhum paciente cadastrado'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-clinic-gray-700">
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">CPF</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Celular</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Origem</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Cadastro</th>
                    <th className="text-center py-3 px-4 text-clinic-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((paciente) => (
                    <tr key={paciente.id_paciente} className="border-b border-clinic-gray-700 hover:bg-clinic-gray-750">
                      <td className="py-3 px-4 text-clinic-white font-medium">{paciente.nome_completo}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{paciente.cpf}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{paciente.celular}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{paciente.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          paciente.status_paciente === 'Ativo' ? 'bg-green-900/20 text-green-400' :
                          'bg-red-900/20 text-red-400'
                        }`}>
                          {paciente.status_paciente || 'Ativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          paciente.origem_lead === 'Instagram' ? 'bg-pink-900/20 text-pink-400' :
                          paciente.origem_lead === 'Google' ? 'bg-blue-900/20 text-blue-400' :
                          'bg-green-900/20 text-green-400'
                        }`}>
                          {paciente.origem_lead || 'Não informado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-clinic-gray-300">
                        {paciente.data_ultima_atualizacao ? 
                          new Date(paciente.data_ultima_atualizacao).toLocaleDateString('pt-BR') :
                          'Não informado'
                        }
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
                          {paciente.status_paciente === 'Ativo' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openModal('delete', paciente)}
                              icon={Trash2}
                            >
                              Inativar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* MODAL CRIAR/EDITAR PACIENTE */}
        {(modalType === 'create' || modalType === 'edit') && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title={modalType === 'create' ? 'Novo Paciente' : 'Editar Paciente'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo *"
                  value={pacienteForm.nome_completo}  
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, nome_completo: e.target.value }))}
                  placeholder="Digite o nome completo"
                  required
                />
                
                <Input
                  label="CPF *"
                  value={pacienteForm.cpf}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  required
                />
                
                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={pacienteForm.data_nascimento}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, data_nascimento: e.target.value }))}
                />
                
                <Select
                  label="Gênero"
                  value={pacienteForm.genero}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, genero: e.target.value }))}
                  options={[
                    { value: '', label: 'Selecione...' },
                    { value: 'Masculino', label: 'Masculino' },
                    { value: 'Feminino', label: 'Feminino' },
                    { value: 'Outro', label: 'Outro' }
                  ]}
                />
                
                <Input
                  label="Celular"
                  value={pacienteForm.celular}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, celular: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={pacienteForm.email}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <Input
                label="Endereço Completo"
                value={pacienteForm.endereco_completo}
                onChange={(e) => setPacienteForm(prev => ({ ...prev, endereco_completo: e.target.value }))}
                placeholder="Rua, número, bairro, cidade, CEP"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status do Paciente"
                  value={pacienteForm.status_paciente}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, status_paciente: e.target.value }))}
                  options={[
                    { value: 'Ativo', label: 'Ativo' },
                    { value: 'Inativo', label: 'Inativo' },
                    { value: 'Suspenso', label: 'Suspenso' }
                  ]}
                />
                
                <Select
                  label="Origem do Lead"
                  value={pacienteForm.origem_lead}
                  onChange={(e) => setPacienteForm(prev => ({ ...prev, origem_lead: e.target.value }))}
                  options={[
                    { value: '', label: 'Selecione a origem...' },
                    { value: 'Instagram', label: 'Instagram' },
                    { value: 'Google', label: 'Google' },
                    { value: 'Facebook', label: 'Facebook' },
                    { value: 'Indicação', label: 'Indicação' },
                    { value: 'Site', label: 'Site' },
                    { value: 'Outros', label: 'Outros' }
                  ]}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  icon={X}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  icon={Save}
                >
                  {submitting ? 'Salvando...' : (modalType === 'create' ? 'Criar Paciente' : 'Salvar Alterações')}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL VER PACIENTE */}
        {modalType === 'view' && selectedPaciente && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title="Detalhes do Paciente"
          >
            <div className="space-y-6">
              {/* Informações Pessoais */}
              <div>
                <h3 className="text-clinic-white font-medium mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-clinic-cyan" />
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-clinic-gray-400">Nome:</span>
                    <p className="text-clinic-white font-medium">{selectedPaciente.nome_completo}</p>
                  </div>
                  <div>
                    <span className="text-clinic-gray-400">CPF:</span>
                    <p className="text-clinic-white">{selectedPaciente.cpf}</p>
                  </div>
                  <div>
                    <span className="text-clinic-gray-400">Data de Nascimento:</span>
                    <p className="text-clinic-white">
                      {selectedPaciente.data_nascimento ? new Date(selectedPaciente.data_nascimento).toLocaleDateString('pt-BR') : 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-clinic-gray-400">Gênero:</span>
                    <p className="text-clinic-white">{selectedPaciente.genero || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="text-clinic-white font-medium mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-clinic-cyan" />
                  Contato
                </h3>
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="text-clinic-gray-400">Celular:</span>
                    <p className="text-clinic-white">{selectedPaciente.celular || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-clinic-gray-400">Email:</span>
                    <p className="text-clinic-white">{selectedPaciente.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-clinic-gray-400">Endereço:</span>
                    <p className="text-clinic-white">{selectedPaciente.endereco_completo || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Status e Origem */}
              <div>
                <h3 className="text-clinic-white font-medium mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-clinic-cyan" />
                  Status e Origem
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-clinic-gray-400">Status:</span>
                    <p className="text-clinic-white">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedPaciente.status_paciente === 'Ativo' ? 'bg-green-900/20 text-green-400' :
                        'bg-red-900/20 text-red-400'
                      }`}>
                        {selectedPaciente.status_paciente || 'Ativo'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-clinic-gray-400">Origem do Lead:</span>
                    <p className="text-clinic-white">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedPaciente.origem_lead === 'Instagram' ? 'bg-pink-900/20 text-pink-400' :
                        selectedPaciente.origem_lead === 'Google' ? 'bg-blue-900/20 text-blue-400' :
                        'bg-green-900/20 text-green-400'
                      }`}>
                        {selectedPaciente.origem_lead || 'Não informado'}
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-clinic-gray-400">Última Atualização:</span>
                    <p className="text-clinic-white">
                      {selectedPaciente.data_ultima_atualizacao ? 
                        new Date(selectedPaciente.data_ultima_atualizacao).toLocaleDateString('pt-BR') :
                        'Não informado'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={closeModal} variant="secondary">
                  Fechar
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ✅ MODAL INATIVAR PACIENTE (mudança de "excluir" para "inativar") */}
        {modalType === 'delete' && selectedPaciente && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title="Inativar Paciente"
          >
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 bg-orange-100/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-clinic-white font-medium mb-2">
                Confirmar Inativação
              </h3>
              <p className="text-clinic-gray-300 mb-6">
                Tem certeza que deseja inativar o paciente <strong>{selectedPaciente.nome_completo}</strong>? 
                O paciente não será excluído, apenas marcado como inativo.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleInactivatePaciente}
                  disabled={submitting}
                  icon={Trash2}
                >
                  {submitting ? 'Inativando...' : 'Confirmar Inativação'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL DE FEEDBACK */}
        <Modal
          isOpen={feedbackModal.isOpen}
          onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
          title={feedbackModal.title}
        >
          <div className="text-center py-4">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              feedbackModal.type === 'success' ? 'bg-green-100/10' : 'bg-red-100/10'
            }`}>
              {feedbackModal.type === 'success' ? (
                <Users className="w-8 h-8 text-green-400" />
              ) : (
                <X className="w-8 h-8 text-red-400" />
              )}
            </div>
            <p className="text-clinic-gray-300">{feedbackModal.message}</p>
            <Button
              onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
              className="mt-4"
            >
              OK
            </Button>
          </div>
        </Modal>
        
        {/* ✅ MODAL NOVA CLÍNICA */}
        <NovaClinicaModal 
          isOpen={showNovaClinicaModal}
          onClose={() => setShowNovaClinicaModal(false)}
          onSuccess={handleClinicaCriada}
        />
      </div>
    </div>
  )
}