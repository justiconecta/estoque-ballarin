import React from 'react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-clinic-black flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          {/* Loading spinner principal */}
          <div className="w-16 h-16 border-4 border-clinic-gray-700 border-t-clinic-cyan rounded-full animate-spin mb-4 mx-auto"></div>
          
          {/* Efeito de pulso */}
          <div className="absolute inset-0 w-16 h-16 border-4 border-clinic-cyan/20 rounded-full animate-ping mx-auto"></div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-clinic-white">Carregando...</h2>
          <p className="text-clinic-gray-400 text-sm">Aguarde um momento</p>
        </div>
        
        {/* Barra de progresso animada */}
        <div className="mt-6 w-48 h-1 bg-clinic-gray-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-clinic-cyan to-clinic-cyan-dark rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}