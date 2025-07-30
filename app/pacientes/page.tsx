'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
  Package,
  Sun,
  Moon
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
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  
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

  // Detectar página atual para botão ativo
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const isCurrentPage = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')
    }
    return currentPath === path
  }

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
    }
  }, [router])

  // Carregar dados iniciais
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

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      loadPacientes()
      return
    }
    
    const filteredPacientes = pacientes.filter(paciente =>
      paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.cpf.includes(searchTerm) ||
      paciente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.telefone.includes(searchTerm)
    )
    setPacientes(filteredPacientes)
  }

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedbackModal({ isOpen: true, type, title, message })
  }

  const openModal = (type: 'create' | 'edit' | 'view' | 'delete', paciente?: Paciente) => {
    setModalType(type)
    setSelectedPaciente(paciente || null)
    
    if (type === 'edit' && paciente) {
      setPacienteForm({
        nome: paciente.nome,
        cpf: paciente.cpf,
        data_nascimento: paciente.data_nascimento || '',
        sexo: paciente.sexo || '',
        telefone: paciente.telefone || '',
        email: paciente.email || '',
        origem_lead: paciente.origem_lead || ''
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
        {/* Header Universal */}
        <header className="bg-gradient-to-r from-clinic-gray-800 via-clinic-gray-750 to-clinic-gray-700 rounded-xl p-6 mb-6 border border-clinic-gray-600 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  src="/justiconecta.png"
                  alt="JustiConecta"
                  width={75}
                  height={75}
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="p-2 bg-clinic-cyan/20 rounded-md backdrop-blur-sm">
                    <Users className="h-5 w-5 text-clinic-cyan" />
                  </div>
                  <h1 className="text-xl font-bold text-clinic-white tracking-tight">Gestão de Pacientes</h1>
                </div>
                <p className="text-clinic-gray-300 text-sm">
                  Cadastro e acompanhamento de pacientes
                </p>
              </div>
            </div>
            
            {/* Navegação Universal */}
            <div className="flex items-center space-x-3">
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/dashboard')} 
                  icon={Home} 
                  size="sm"
                  className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                    isCurrentPage('/dashboard')
                      ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                      : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                  }`}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/estoque')} 
                  icon={Package} 
                  size="sm"
                  className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                    isCurrentPage('/estoque')
                      ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                      : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                  }`}
                >
                  Estoque
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/pacientes')} 
                  icon={Users} 
                  size="sm"
                  className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                    isCurrentPage('/pacientes')
                      ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                      : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                  }`}
                >
                  Pacientes
                </Button>
              </div>
              
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
                <Button 
                  variant="secondary" 
                  onClick={toggleTheme} 
                  icon={isDarkTheme ? Sun : Moon} 
                  size="sm"
                  className="w-12 h-10 flex items-center justify-center hover:bg-clinic-cyan hover:text-clinic-black transition-all duration-300 hover:scale-105 rounded-md font-medium"
                  title={isDarkTheme ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                />
                
                <Button 
                  variant="secondary" 
                  onClick={handleLogout} 
                  icon={LogOut} 
                  size="sm"
                  className="px-4 py-2 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 rounded-md font-medium"
                >
                  Sair
                </Button>
              </div>
            </div>
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
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Telefone</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Origem</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Cadastro</th>
                    <th className="text-center py-3 px-4 text-clinic-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((paciente) => (
                    <tr key={paciente.id_paciente} className="border-b border-clinic-gray-700 hover:bg-clinic-gray-750">
                      <td className="py-3 px-4 text-clinic-white font-medium">{paciente.nome}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{paciente.cpf}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{paciente.telefone}</td>
                      <td className="py-3 px-4 text-clinic-gray-300">{paciente.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
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
    </div>
  )
}