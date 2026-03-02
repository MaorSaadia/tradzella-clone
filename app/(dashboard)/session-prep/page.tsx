// app/(dashboard)/session-prep/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SessionPrepClient } from '@/components/ai/SessionPrepClient'

export const metadata = {
  title: 'Session Prep — MSFunded',
}

export default async function SessionPrepPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <SessionPrepClient />
}