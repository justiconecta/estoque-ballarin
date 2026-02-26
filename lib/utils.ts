// lib/utils.ts — Funções utilitárias compartilhadas

export const getClasseBadge = (classe: string | null): string => {
  switch (classe) {
    case 'Toxina Botulinica': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    case 'Preenchedor': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
    case 'Bioestimulador': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    case 'Bioregenerador': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    case 'Skinbooster': return 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
    case 'Fios de PDO': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
    default: return 'bg-slate-600/20 text-slate-200 border border-slate-600/30'
  }
}
