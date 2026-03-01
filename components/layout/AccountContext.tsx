/* eslint-disable react-hooks/set-state-in-effect */
'use client'

// components/layout/AccountContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface AccountOption {
  id: string           // propFirmAccount.id or 'all'
  label: string        // "50K Eval #1"
  firmName: string     // "Apex"
  firmColor: string
  status: string
  stage: string
  accountSize: number
  currentBalance: number
}

interface AccountContextValue {
  accounts: AccountOption[]
  selected: AccountOption | null   // null = "All Accounts"
  setSelected: (a: AccountOption | null) => void
  setAccounts: (a: AccountOption[]) => void
}

const AccountContext = createContext<AccountContextValue>({
  accounts: [],
  selected: null,
  setSelected: () => {},
  setAccounts: () => {},
})

export function AccountProvider({ children, initialAccounts }: {
  children: ReactNode
  initialAccounts: AccountOption[]
}) {
  const [accounts, setAccounts] = useState<AccountOption[]>(initialAccounts)
  const [selected, setSelectedRaw] = useState<AccountOption | null>(null)

  // Persist selection in localStorage
  function setSelected(account: AccountOption | null) {
    setSelectedRaw(account)
    if (account) localStorage.setItem('msfunded_account', account.id)
    else localStorage.removeItem('msfunded_account')
  }

  // Restore on mount
  useEffect(() => {
    const saved = localStorage.getItem('msfunded_account')
    if (saved) {
      const found = initialAccounts.find(a => a.id === saved)
      if (found) setSelectedRaw(found)
    }
  }, [initialAccounts])

  // Keep accounts in sync when props change
  useEffect(() => {
    setAccounts(initialAccounts)
    // Update selected if it changed
    setSelectedRaw(prev => {
      if (!prev) return null
      return initialAccounts.find(a => a.id === prev.id) ?? null
    })
  }, [initialAccounts])

  return (
    <AccountContext.Provider value={{ accounts, selected, setSelected, setAccounts }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
