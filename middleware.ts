import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Lista de rotas válidas da aplicação - INCLUINDO DASHBOARDS ESPECIALIZADOS
  const validRoutes = [
    '/',
    '/login',
    '/dashboard',
    '/dashboard/marketing', 
    '/dashboard/terapeutico',
    '/estoque',
    '/pacientes'
  ]

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

  // Se não é uma rota válida, redirecionar para página raiz
  // que irá fazer o redirecionamento correto baseado na autenticação
  if (!validRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

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