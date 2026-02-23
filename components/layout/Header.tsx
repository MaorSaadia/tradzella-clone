'use client'

// components/layout/Header.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, Loader2, LogOut, User } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from './ThemeToggle'
import { AccountSwitcher } from './AccountSwitcher'

interface HeaderProps {
  user: { name?: string | null; email?: string | null }
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
      if (res.ok) toast.success(data.message ?? 'Sync complete')
      else toast.error(data.error ?? 'Sync failed')
    } catch { toast.error('Network error') }
    finally { setSyncing(false); router.refresh() }
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center gap-3 px-6 shrink-0">

      {/* Account switcher — left side after logo */}
      <AccountSwitcher />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className="gap-2 h-9 text-xs font-semibold"
      >
        {syncing
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />
        }
        Sync Now
      </Button>

      <ThemeToggle />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-500/20 text-emerald-500 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold truncate">{user.name ?? 'Trader'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" onClick={() => router.push('/settings')}>
            <User className="w-3.5 h-3.5" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-red-500 focus:text-red-500"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}