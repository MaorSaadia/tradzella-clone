'use client'

// components/layout/Sidebar.tsx — Updated with Playbook + Compare links

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, BarChart3, Building2,
  Upload, Settings, LogOut, GitCompare, ChevronRight,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const NAV = [
  {
    section: 'OVERVIEW',
    items: [
      { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/journal',    icon: BookOpen,         label: 'Trade Journal' },
      { href: '/analytics',  icon: BarChart3,        label: 'Analytics' },
    ],
  },
  {
    section: 'STRATEGY',
    items: [
      { href: '/playbook',   icon: BookOpen,    label: 'Playbook',  badge: 'NEW' },
      { href: '/compare',    icon: GitCompare,  label: 'Compare',   badge: 'NEW' },
      { href: '/propfirms',  icon: Building2,   label: 'Prop Firms' },
    ],
  },
  {
    section: 'IMPORT',
    items: [
      { href: '/import',     icon: Upload,      label: 'Import CSV' },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      { href: '/settings',   icon: Settings,    label: 'Settings' },
    ],
  },
]

interface SidebarProps {
  user: { name?: string | null; email?: string | null }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? 'T'

  return (
    <aside className="w-56 h-screen bg-card border-r border-border flex flex-col shrink-0">
      <div className="h-16 flex items-center px-5 border-b border-border gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <span className="text-black font-black text-sm">T</span>
        </div>
        <span className="font-black text-base tracking-tight">
          Trad<span className="text-emerald-500">Zella</span>
        </span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto border-emerald-500/30 text-emerald-500">
          BETA
        </Badge>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(section => (
          <div key={section.section} className="mb-5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">
              {section.section}
            </p>
            {section.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold transition-all group mb-0.5',
                    isActive ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-emerald-500' : '')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500 text-black font-bold">{item.badge}</Badge>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-emerald-500" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
          onClick={() => signOut({ callbackUrl: '/login' })}>
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-emerald-500/20 text-emerald-500 text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{user.name ?? 'Trader'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </aside>
  )
}