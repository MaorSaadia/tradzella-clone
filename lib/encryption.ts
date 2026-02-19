// types/index.ts

export type TradeStats = {
  netPnl: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  totalTrades: number
  wins: number
  losses: number
  avgWin: number
  avgLoss: number
  expectancy: number
  bestTrade: number
  worstTrade: number
}

export type TradeSide = 'long' | 'short'
export type TradeGrade = 'A+' | 'A' | 'B' | 'C' | 'D'
export type TradeEmotion = 'calm' | 'fomo' | 'revenge' | 'confident' | 'anxious' | 'neutral'
export type Environment = 'demo' | 'live'

export type TradovateTokenResponse = {
  accessToken: string
  expirationTime: string
  userId: number
  name: string
  userStatus: string
}

export type TradovateFill = {
  id: number
  contractId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  action: 'Buy' | 'Sell'
  qty: number
  price: number
  orderId: number
  buyerCommission: number
  sellerCommission: number
}

export type TradovateAccount = {
  id: number
  name: string
  userId: number
  accountType: string
  active: boolean
  clearingHouseId: number
  riskCategoryId: number
  autoLiqProfileId: number
  marginAccountType: string
  legalStatus: string
}