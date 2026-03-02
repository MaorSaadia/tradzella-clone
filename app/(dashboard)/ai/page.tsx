// app/(dashboard)/ai/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AIChatClient } from '@/components/ai/AIChatClient'

export const metadata = {
  title: 'AI Coach - MSFunded',
  description: 'Ask your trading data anything',
}

export default async function AIPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return <AIChatClient />
}
