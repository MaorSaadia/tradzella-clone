// app/(dashboard)/challenge-coach/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ChallengeCoachClient } from '@/components/ai/ChallengeCoachClient'

export const metadata = { title: 'Challenge Coach — MSFunded' }

export default async function ChallengeCoachPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <ChallengeCoachClient />
}