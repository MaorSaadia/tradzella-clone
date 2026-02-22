'use client'

// components/layout/Header.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? 'T'

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/tradovate/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Sync failed')
        return
      }

      toast.success(data.message)
      router.refresh() // re-fetch server components with new data
    } catch {
      toast.error('Network error — could not sync')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">

      {/* Left — page context (empty, pages set their own title) */}
      <div />

      {/* Right — actions */}
      <div className="flex items-center gap-2">

        {/* Sync button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>

        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-500/20 text-emerald-500 text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">{user.name ?? 'Trader'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500 cursor-pointer"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}