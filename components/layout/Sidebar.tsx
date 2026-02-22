'use client'

// components/layout/Sidebar.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Settings,
  TrendingUp,
  ChevronRight,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const NAV_ITEMS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/journal', icon: BookOpen, label: 'Trade Journal' },
      { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'Import',
    items: [
      { href: '/import', icon: Upload, label: 'Import CSV' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? 'T'

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-black" />
        </div>
        <span className="text-lg font-black tracking-tight">
          Trad<span className="text-emerald-500">Zella</span>
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
          BETA
        </Badge>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_ITEMS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className={cn(
                      'w-4 h-4 shrink-0',
                      isActive ? 'text-emerald-500' : 'text-muted-foreground group-hover:text-foreground'
                    )} />
                    {item.label}
                    {isActive && (
                      <ChevronRight className="w-3 h-3 ml-auto text-emerald-500" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors cursor-default">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-500/20 text-emerald-500 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name ?? 'Trader'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}