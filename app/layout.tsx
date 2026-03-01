// app/layout.tsx — Updated root layout with PWA support

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { PWARegister } from '@/components/PWARegister'
import { ConfirmDialogProvider } from '@/components/layout/ConfirmDialogProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MSFunded — Prop Firm Trading Journal',
  description: 'Track your prop firm challenges, analyze performance, and build winning habits',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MSFunded',
  },
  icons: {
    icon: '/msfunded-icon-192.png',
    apple: '/msfunded-icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/msfunded-icon-192.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ConfirmDialogProvider>
            {children}
            <Toaster richColors position="bottom-right" />
            <PWARegister />
          </ConfirmDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
