// components/NovaClinicaModal.tsx
'use client'

import React, { useState } from 'react'
import { X, Building, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'

interface NovaClinicaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ClinicaForm {
  nome_clinica: string
  cnpj: string
  endereco: string
  telefone: string
  email: string
  admin_nome: string
  admin_email: string
  admin_usuario: string
}

const clinicaFormInitial: ClinicaForm = {
  nome_clinica: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  admin_nome: '',
  admin_email: '',
  admin_usuario: ''
}

export default function NovaClinicaModal({ isOpen, onClose, onSuccess }: NovaClinicaModalProps) {
  const [form, setForm] = useState<ClinicaForm>(clinicaFormInitial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (submitting) return
    setForm(clinicaFormInitial)
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações básicas
    if (!form.nome_clinica.trim()) {
      setError('Nome da clínica é obrigatório')
      return
    }

    if (!form.admin_nome.trim()) {
      setError('Nome do administrador é obrigatório')
      return
    }

    if (!form.admin_usuario.trim()) {
      setError('Usuário do administrador é obrigatório')
      return
    }

    if (form.admin_usuario.includes('.') || form.admin_usuario.includes(' ')) {
      setError('Usuário deve ser uma palavra simples (ex: ballarin, santos, silva)')
      return
    }

    try {
      setSubmitting(true)

      // 1. Criar clínica
      const novaClinica = await supabaseApi.createClinica({
        nome_clinica: form.nome_clinica.trim(),
        cnpj: form.cnpj.trim() || undefined,
        endereco: form.endereco.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined
      })

      // 2. Criar admin da clínica
      const adminClinica = await supabaseApi.createAdminClinica(
        novaClinica.id_clinica,
        {
          nome_completo: form.admin_nome.trim(),
          email: form.admin_email.trim() || `admin.${form.admin_usuario}@${form.nome_clinica.toLowerCase().replace(/\s+/g, '')}.com.br`,
          usuario_base: form.admin_usuario.trim().toLowerCase()
        }
      )

      console.log('✅ CLÍNICA CRIADA:', {
        clinica: novaClinica.nome_clinica,
        admin: adminClinica.usuario,
        senha_inicial: adminClinica.senha_inicial
      })

      // Mostrar informações de login para o admin
      alert(`✅ Clínica criada com sucesso!

📍 Clínica: ${novaClinica.nome_clinica}
👤 Admin: ${adminClinica.usuario}
🔑 Senha inicial: ${adminClinica.senha_inicial}

⚠️ O administrador deve alterar a senha no primeiro login.`)

      handleClose()
      onSuccess()

    } catch (error: any) {
      console.error('❌ Erro ao criar clínica:', error)
      setError(error.message || 'Erro ao criar clínica')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof ClinicaForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-clinic-gray-800 rounded-xl border border-clinic-gray-600 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-clinic-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-clinic-cyan/20 rounded-lg">
              <Building className="w-5 h-5 text-clinic-cyan" />
            </div>
            <h2 className="text-xl font-bold text-clinic-white">Nova Clínica</h2>
          </div>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
            icon={X}
            size="sm"
            className="w-10 h-10 flex items-center justify-center"
          />
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
          
          {/* Erro */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            
            {/* Dados da Clínica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-clinic-white flex items-center gap-2">
                <Building className="w-5 h-5 text-clinic-cyan" />
                Dados da Clínica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    Nome da Clínica *
                  </label>
                  <input
                    type="text"
                    value={form.nome_clinica}
                    onChange={(e) => handleInputChange('nome_clinica', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="Ex: Clínica São Paulo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="00.000.000/0001-00"
                  />
                </div>

                <div>
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="Rua, número, bairro, cidade - UF"
                  />
                </div>

                <div>
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="contato@clinica.com.br"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Admin */}
            <div className="space-y-4 border-t border-clinic-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-clinic-white flex items-center gap-2">
                <User className="w-5 h-5 text-clinic-cyan" />
                Administrador da Clínica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    Nome Completo do Admin *
                  </label>
                  <input
                    type="text"
                    value={form.admin_nome}
                    onChange={(e) => handleInputChange('admin_nome', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="Dr. João Santos"
                    required
                  />
                </div>

                <div>
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    Usuário de Login *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-clinic-gray-400 text-sm">
                      admin.
                    </span>
                    <input
                      type="text"
                      value={form.admin_usuario}
                      onChange={(e) => handleInputChange('admin_usuario', e.target.value.toLowerCase())}
                      className="w-full pl-16 pr-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                      placeholder="santos"
                      required
                    />
                  </div>
                  <p className="text-clinic-gray-500 text-xs mt-1">
                    Login será: admin.{form.admin_usuario}
                  </p>
                </div>

                <div>
                  <label className="block text-clinic-gray-300 text-sm font-medium mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email do Admin
                  </label>
                  <input
                    type="email"
                    value={form.admin_email}
                    onChange={(e) => handleInputChange('admin_email', e.target.value)}
                    className="w-full px-4 py-3 bg-clinic-gray-700 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:border-clinic-cyan focus:ring-1 focus:ring-clinic-cyan"
                    placeholder="admin@clinica.com.br (opcional)"
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-clinic-cyan/10 border border-clinic-cyan/20 rounded-lg p-4">
              <p className="text-clinic-cyan text-sm">
                ℹ️ Após criar a clínica, será gerada uma senha temporária para o administrador. 
                Ele deve alterar a senha no primeiro login.
              </p>
            </div>

          </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-clinic-gray-700 bg-clinic-gray-800">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            icon={Building}
          >
            {submitting ? 'Criando...' : 'Criar Clínica'}
          </Button>
        </div>
      </div>
    </div>
  )
}