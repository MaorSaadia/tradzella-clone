// lib/db/schema.ts — COMPLETE FINAL VERSION

import {
  pgTable, uuid, text, integer, numeric,
  timestamp, json, boolean, pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ──────────────────────────────────────────────────
export const sideEnum = pgEnum('side', ['long', 'short'])
export const envEnum = pgEnum('environment', ['demo', 'live'])
export const gradeEnum = pgEnum('grade', ['A+', 'A', 'B', 'C', 'D'])
export const emotionEnum = pgEnum('emotion', ['calm', 'fomo', 'revenge', 'confident', 'anxious', 'neutral'])
export const challengeStageEnum = pgEnum('challenge_stage', ['evaluation', 'phase2', 'funded', 'failed', 'passed'])
export const firmStatusEnum = pgEnum('firm_status', ['active', 'passed', 'failed', 'paused'])
export const playbookStatusEnum = pgEnum('playbook_status', ['active', 'paused', 'retired'])
export const mistakeTypeEnum = pgEnum('mistake_type', [
  'fomo_entry', 'revenge_trade', 'oversized_position', 'no_setup',
  'moved_stop', 'held_through_news', 'overtraded', 'early_exit',
  'late_exit', 'broke_daily_limit', 'chased_price', 'custom',
])

// ── Users ──────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  trades: many(trades),
  tradovateAccounts: many(tradovateAccounts),
  propFirms: many(propFirms),
  propFirmAccounts: many(propFirmAccounts),
  playbooks: many(playbooks),
  tradeMistakes: many(tradeMistakes),
  weeklyReviews: many(weeklyReviews),
}))

// ── Tradovate Accounts ─────────────────────────────────────
export const tradovateAccounts = pgTable('tradovate_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tradovateUserId: integer('tradovate_user_id'),
  tradovateAccountId: integer('tradovate_account_id'),
  accountName: text('account_name'),
  environment: envEnum('environment').default('demo'),
  accessTokenEncrypted: text('access_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at'),
  usernameEncrypted: text('username_encrypted'),
  passwordEncrypted: text('password_encrypted'),
  cidEncrypted: text('cid_encrypted'),
  secretEncrypted: text('secret_encrypted'),
  lastSyncAt: timestamp('last_sync_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const tradovateAccountsRelations = relations(tradovateAccounts, ({ one }) => ({
  user: one(users, { fields: [tradovateAccounts.userId], references: [users.id] }),
}))

// ── Prop Firms ─────────────────────────────────────────────
export const propFirms = pgTable('prop_firms', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  shortName: text('short_name'),
  logoColor: text('logo_color').default('#10b981'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const propFirmsRelations = relations(propFirms, ({ one, many }) => ({
  user: one(users, { fields: [propFirms.userId], references: [users.id] }),
  accounts: many(propFirmAccounts),
}))

// ── Prop Firm Accounts ─────────────────────────────────────
export const propFirmAccounts = pgTable('prop_firm_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  propFirmId: uuid('prop_firm_id').notNull().references(() => propFirms.id, { onDelete: 'cascade' }),
  accountLabel: text('account_label').notNull(),
  accountSize: numeric('account_size', { precision: 12, scale: 2 }).notNull(),
  stage: challengeStageEnum('stage').default('evaluation'),
  status: firmStatusEnum('status').default('active'),
  profitTarget: numeric('profit_target', { precision: 12, scale: 2 }),
  maxDrawdown: numeric('max_drawdown', { precision: 12, scale: 2 }),
  dailyLossLimit: numeric('daily_loss_limit', { precision: 12, scale: 2 }),
  minTradingDays: integer('min_trading_days'),
  maxTradingDays: integer('max_trading_days'),
  isTrailingDrawdown: boolean('is_trailing_drawdown').default(false),
  consistencyRule: boolean('consistency_rule').default(false),
  newsTrading: boolean('news_trading').default(true),
  weekendHolding: boolean('weekend_holding').default(false),
  notes: text('notes').default(''),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const propFirmAccountsRelations = relations(propFirmAccounts, ({ one, many }) => ({
  user: one(users, { fields: [propFirmAccounts.userId], references: [users.id] }),
  propFirm: one(propFirms, { fields: [propFirmAccounts.propFirmId], references: [propFirms.id] }),
  trades: many(trades),
}))

// ── Playbooks ──────────────────────────────────────────────
export const playbooks = pgTable('playbooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').default(''),
  category: text('category').default(''),
  color: text('color').default('#10b981'),
  emoji: text('emoji').default('📈'),
  entryRules: json('entry_rules').$type<string[]>().default([]),
  exitRules: json('exit_rules').$type<string[]>().default([]),
  riskRules: json('risk_rules').$type<string[]>().default([]),
  idealRR: numeric('ideal_rr', { precision: 4, scale: 2 }),
  maxLossPerTrade: numeric('max_loss_per_trade', { precision: 10, scale: 2 }),
  status: playbookStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const playbooksRelations = relations(playbooks, ({ one, many }) => ({
  user: one(users, { fields: [playbooks.userId], references: [users.id] }),
  trades: many(trades),
}))

// ── Trade Mistakes ─────────────────────────────────────────
export const tradeMistakes = pgTable('trade_mistakes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tradeId: uuid('trade_id').notNull().references(() => trades.id, { onDelete: 'cascade' }),
  mistakeType: mistakeTypeEnum('mistake_type').notNull(),
  description: text('description').default(''),
  severity: integer('severity').default(1),
  createdAt: timestamp('created_at').defaultNow(),
})

export const tradeMistakesRelations = relations(tradeMistakes, ({ one }) => ({
  user: one(users, { fields: [tradeMistakes.userId], references: [users.id] }),
  trade: one(trades, { fields: [tradeMistakes.tradeId], references: [trades.id] }),
}))

// ── Trades ─────────────────────────────────────────────────
export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tradovateAccountId: uuid('tradovate_account_id').references(() => tradovateAccounts.id),
  propFirmAccountId: uuid('prop_firm_account_id').references(() => propFirmAccounts.id, { onDelete: 'set null' }),
  playbookId: uuid('playbook_id').references(() => playbooks.id, { onDelete: 'set null' }),
  playbookIds: json('playbook_ids').$type<string[]>().default([]),
  tradovateTradeId: text('tradovate_trade_id').unique(),
  symbol: text('symbol').notNull(),
  side: sideEnum('side').notNull(),
  entryPrice: numeric('entry_price', { precision: 12, scale: 4 }).notNull(),
  exitPrice: numeric('exit_price', { precision: 12, scale: 4 }).notNull(),
  qty: integer('qty').notNull(),
  pnl: numeric('pnl', { precision: 12, scale: 2 }).notNull(),
  commission: numeric('commission', { precision: 8, scale: 2 }).default('0'),
  entryTime: timestamp('entry_time').notNull(),
  exitTime: timestamp('exit_time').notNull(),
  tags: json('tags').$type<string[]>().default([]),
  notes: text('notes').default(''),
  screenshot: text('screenshot'),
  grade: gradeEnum('grade'),
  emotion: emotionEnum('emotion'),
  isMistake: boolean('is_mistake').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const tradesRelations = relations(trades, ({ one, many }) => ({
  user: one(users, { fields: [trades.userId], references: [users.id] }),
  propFirmAccount: one(propFirmAccounts, { fields: [trades.propFirmAccountId], references: [propFirmAccounts.id] }),
  tradovateAccount: one(tradovateAccounts, { fields: [trades.tradovateAccountId], references: [tradovateAccounts.id] }),
  playbook: one(playbooks, { fields: [trades.playbookId], references: [playbooks.id] }),
  mistakes: many(tradeMistakes),
}))

// ── WeeklyReviews ─────────────────────────────────────────────────
export const weeklyReviews = pgTable('weekly_reviews', {
  id:              uuid('id').defaultRandom().primaryKey(),
  userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    propFirmAccountId: uuid('prop_firm_account_id'),        
  weekStart:       timestamp('week_start').notNull(),
  weekEnd:         timestamp('week_end').notNull(),
  weekLabel:       text('week_label').notNull(),
  overallScore:    integer('overall_score').notNull(),
  disciplineScore: integer('discipline_score').notNull(),
  headline:        text('headline').notNull(),
  reviewData:      json('review_data').notNull(),
  tradeCount:      integer('trade_count').default(0),
  netPnl:          numeric('net_pnl', { precision: 12, scale: 2 }),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
})

export const weeklyReviewsRelations = relations(weeklyReviews, ({ one }) => ({
  user: one(users, { fields: [weeklyReviews.userId], references: [users.id] }),
}))

// ── Types ──────────────────────────────────────────────────
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type TradovateAccount = typeof tradovateAccounts.$inferSelect
export type PropFirm = typeof propFirms.$inferSelect
export type NewPropFirm = typeof propFirms.$inferInsert
export type PropFirmAccount = typeof propFirmAccounts.$inferSelect
export type NewPropFirmAccount = typeof propFirmAccounts.$inferInsert
export type Playbook = typeof playbooks.$inferSelect
export type NewPlaybook = typeof playbooks.$inferInsert
export type TradeMistake = typeof tradeMistakes.$inferSelect
export type NewTradeMistake = typeof tradeMistakes.$inferInsert
export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert
export type WeeklyReview    = typeof weeklyReviews.$inferSelect
export type NewWeeklyReview = typeof weeklyReviews.$inferInsert
