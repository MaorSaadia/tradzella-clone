// // /app/(dashboard)/dashboard/page.tsx
// import { auth } from '@/lib/auth'
// import { db } from '@/lib/db'
// import { trades } from '@/lib/db/schema'
// import { eq } from 'drizzle-orm'
// // import { StatsCards } from '@/components/dashboard/StatsCards'
// // import { PnLChart } from '@/components/dashboard/PnLChart'

// export default async function DashboardPage() {
//   const session = await auth()
  
//   // Server-side data fetch — no useEffect needed!
//   const userTrades = await db.query.trades.findMany({
//     where: eq(trades.userId, session!.user!.id),
//     orderBy: (trades, { desc }) => [desc(trades.entryTime)],
//   })

//   return (
//     <div className="p-6 space-y-6">
//       <StatsCards trades={userTrades} />
//       <PnLChart trades={userTrades} />
//     </div>
//   )
// }