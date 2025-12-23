'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useData } from '@/contexts/DataContext'

interface Paciente {
  id_paciente: number
  nome_completo: string
  cpf: string
  data_nascimento?: string
  celular?: string
}

interface BuscaPacienteDropdownProps {
  onSelectPaciente: (paciente: Paciente) => void
  selectedPaciente: Paciente | null
  className?: string
  // ✅ NOVA PROP: Lista customizada de pacientes (se não passar, usa cache global)
  pacientesList?: Paciente[]
  // ✅ NOVA PROP: Placeholder customizado
  placeholder?: string
}

export default function BuscaPacienteDropdown({ 
  onSelectPaciente, 
  selectedPaciente,
  className = '',
  pacientesList,
  placeholder
}: BuscaPacienteDropdownProps) {
  // USA PACIENTES DO CACHE GLOBAL (fallback)
  const { pacientes: pacientesGlobal, loading: dataLoading } = useData()
  
  // ✅ Usa lista customizada se fornecida, senão usa cache global
  const pacientes = pacientesList ?? pacientesGlobal
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce da busca
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchTerm])

  // Filtrar pacientes com base na busca (memoizado)
  const filteredPacientes = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return pacientes.slice(0, 20) // Mostrar até 20 quando não tem busca
    }
    
    const searchLower = debouncedSearch.toLowerCase()
    const searchDigits = debouncedSearch.replace(/\D/g, '')
    
    return pacientes
      .filter(p => 
        p.nome_completo?.toLowerCase().includes(searchLower) ||
        p.cpf?.includes(searchDigits)
      )
      .slice(0, 20)
  }, [pacientes, debouncedSearch])

  const handleSelect = useCallback((paciente: Paciente) => {
    onSelectPaciente(paciente)
    setSearchTerm('')
    setIsOpen(false)
  }, [onSelectPaciente])

  const handleFocus = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const formatCPF = (cpf: string) => {
    if (!cpf) return ''
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Placeholder dinâmico
  const placeholderText = placeholder 
    || (selectedPaciente 
      ? `${selectedPaciente.nome_completo} - ${formatCPF(selectedPaciente.cpf)}` 
      : "Buscar por nome ou CPF...")

  // Loading só aparece se estiver usando cache global e ele estiver carregando
  const isLoading = !pacientesList && dataLoading

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-clinic-gray-300 mb-2">
        Selecionar Paciente:
      </label>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-clinic-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholderText}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus}
          className="w-full pl-10 pr-4 py-2.5 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:ring-2 focus:ring-clinic-cyan focus:border-transparent"
        />
      </div>

      {isOpen && (
        <>
          {/* Backdrop para fechar ao clicar fora */}
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 9998 }}
            onClick={handleClose}
          />
          
          {/* Dropdown */}
          <div 
            className="absolute w-full mt-1 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            {isLoading ? (
              <div className="p-4 text-center text-clinic-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
                Carregando...
              </div>
            ) : filteredPacientes.length === 0 ? (
              <div className="p-4 text-center text-clinic-gray-400">
                {pacientes.length === 0 
                  ? 'Nenhum paciente com resumo disponível' 
                  : 'Nenhum paciente encontrado'}
              </div>
            ) : (
              filteredPacientes.map(paciente => (
                <button
                  key={paciente.id_paciente}
                  onClick={() => handleSelect(paciente)}
                  className="w-full px-4 py-3 text-left bg-clinic-gray-800 hover:bg-clinic-gray-700 transition-colors border-b border-clinic-gray-700 last:border-b-0"
                >
                  <p className="font-medium text-clinic-white">{paciente.nome_completo}</p>
                  <p className="text-sm text-clinic-gray-400">
                    CPF: {formatCPF(paciente.cpf)}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}