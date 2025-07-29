import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas que não precisam de verificação (assets, api, etc)
  const excludedPaths = [
    '/api',
    '/_next',
    '/_vercel',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ]

  // Verificar se é um path excluído
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Lista de rotas válidas da aplicação
  const validRoutes = [
    '/',
    '/login',
    '/dashboard',
    '/dashboard/marketing', 
    '/dashboard/terapeutico',
    '/estoque',
    '/pacientes'
  ]

  // Se é uma rota válida, permitir
  if (validRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Para qualquer outra rota, permitir que o Next.js handle (vai cair no not-found.tsx)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - _vercel (Vercel internals)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|_vercel|robots.txt|sitemap.xml).*)',
  ],
}