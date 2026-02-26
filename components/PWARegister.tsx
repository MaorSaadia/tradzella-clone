/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// components/PWARegister.tsx
// Registers service worker + shows install prompt

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.warn('SW registration failed:', err))
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
      toast.success('MSFunded installed! Find it on your home screen.')
    }
  }

  // Show toast with install button once
  useEffect(() => {
    if (!installPrompt || isInstalled) return
    const shown = sessionStorage.getItem('pwa_prompt_shown')
    if (shown) return
    sessionStorage.setItem('pwa_prompt_shown', '1')

    setTimeout(() => {
      toast(
        <div className="flex items-center gap-3">
          <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Install MSFunded</p>
            <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
          </div>
          <Button size="sm" onClick={handleInstall}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs h-7 px-3 shrink-0">
            Install
          </Button>
        </div>,
        { duration: 10000, id: 'pwa-install' }
      )
    }, 5000) // Show after 5s
  }, [installPrompt])

  return null
}