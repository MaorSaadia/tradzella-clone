// proxy.ts (project root, not inside app/)

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isDashboard = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/journal') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings')

  // Redirect unauthenticated users to login
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
