// src/app/layout.tsx
import { ReactNode } from 'react'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}