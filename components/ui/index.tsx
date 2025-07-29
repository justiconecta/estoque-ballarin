import React from 'react'
import { LucideIcon } from 'lucide-react'

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-clinic-cyan text-clinic-black hover:bg-clinic-cyan-dark focus:ring-clinic-cyan',
    secondary: 'bg-clinic-gray-700 text-clinic-white hover:bg-clinic-gray-600 focus:ring-clinic-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
          Carregando...
        </div>
      ) : (
        <div className="flex items-center justify-center">
          {Icon && <Icon className="w-4 h-4 mr-2" />}
          {children}
        </div>
      )}
    </button>
  )
}

// Input Component  
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-clinic-white mb-1">
          {label}
        </label>
      )}
      <input
        className={`
          block w-full px-3 py-2 bg-clinic-gray-800 border border-clinic-gray-600 
          rounded-md text-clinic-white placeholder-clinic-gray-400
          focus:outline-none focus:ring-2 focus:ring-clinic-cyan focus:border-clinic-cyan
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string | number; label: string }[]
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-clinic-white mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          block w-full px-3 py-2 bg-clinic-gray-800 border border-clinic-gray-600 
          rounded-md text-clinic-white
          focus:outline-none focus:ring-2 focus:ring-clinic-cyan focus:border-clinic-cyan
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-400 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

// Card Component
interface CardProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-clinic-gray-800 rounded-xl shadow-lg border border-clinic-gray-700 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-clinic-gray-700">
          <h3 className="text-lg font-semibold text-clinic-white">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

// Modal Component
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-clinic-gray-800 rounded-lg shadow-xl border border-clinic-gray-700 w-full max-w-md">
        <div className="px-6 py-4 border-b border-clinic-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-clinic-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-clinic-gray-400 hover:text-clinic-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}