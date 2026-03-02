/* eslint-disable @next/next/no-img-element */
'use client'

// components/layout/Sidebar.tsx — Updated with Review link

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, BarChart3, Building2,
  Upload, Settings, LogOut, GitCompare, ChevronRight,
  FileText, Brain, CalendarClock,
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
      { href: '/playbook',   icon: FileText,    label: 'Playbook',    badge: 'NEW' },
      { href: '/compare',    icon: GitCompare,  label: 'Compare',     badge: 'NEW' },
      { href: '/propfirms',  icon: Building2,   label: 'Prop Firms' },
    ],
  },
  {
    section: 'AI COACH',
    items: [
      { href: '/ai',         icon: Brain,          label: 'AI Chat',        badge: 'AI' },
      { href: '/review',     icon: CalendarClock,  label: 'Weekly Review',  badge: 'AI' },
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
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border gap-2.5 shrink-0">
        <img
          src="/ms-icon-transparent.png"
          alt="MS"
          className="h-8 w-auto object-contain shrink-0"
        />
        <span className="font-black text-base tracking-tight">
          <span className="text-emerald-400">MS</span><span className="text-white">Funded</span>
        </span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto border-emerald-500/30 text-emerald-500">
          BETA
        </Badge>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(section => (
          <div key={section.section} className="mb-5">
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-2 mb-1.5",
              section.section === 'AI COACH'
                ? 'text-violet-400/80'
                : 'text-muted-foreground/50'
            )}>
              {section.section}
            </p>
            {section.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              const isAI = item.badge === 'AI'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold transition-all group mb-0.5',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-emerald-500')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge className={cn(
                      'text-[9px] px-1.5 py-0 h-4 font-bold',
                      isAI
                        ? 'to-emerald-500 text-white border-0'
                        : 'bg-emerald-500 text-black'
                    )}>
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-emerald-500" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-emerald-500/20 text-emerald-500 text-xs font-bold">
              {initials}
            </AvatarFallback>
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