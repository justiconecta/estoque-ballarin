/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Otimizações de compilação
  compiler: {
    // Remove console.log em produção
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // ✅ Otimizações experimentais
  experimental: {
    // Tree-shake automático para ícones
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  
  // ✅ TypeScript e ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // ✅ Imagens externas permitidas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jlprybnxjqzaqzsxxnuh.supabase.co',
        pathname: '/**',
      },
    ],
  },
  
  // ✅ Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig