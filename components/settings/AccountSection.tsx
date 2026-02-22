// components/settings/AccountSection.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from 'lucide-react'

interface AccountSectionProps {
  user: {
    id?: string
    name?: string | null
    email?: string | null
  }
}

export function AccountSection({ user }: AccountSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription className="text-xs">Your TradZella account details</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Name', value: user.name ?? '—' },
            { label: 'Email', value: user.email ?? '—' },
            { label: 'User ID', value: user.id ? user.id.slice(0, 8) + '...' : '—' },
            { label: 'Plan', value: 'Free Beta' },
          ].map(item => (
            <div key={item.label} className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {item.label}
              </p>
              <p className="text-sm font-semibold truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}