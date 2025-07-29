// Verificação de variáveis de ambiente
export function checkEnvironmentVariables() {
  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars)
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  console.log('✅ Environment variables loaded successfully')
  return true
}

// Configurações do sistema
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  app: {
    name: 'Clínica Ballarin - Controle de Estoque',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }
}

// Debug helper
export function debugEnv() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Environment Variables Debug:')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
  }
}