// lib/db/schema.ts — with relations defined for Drizzle `with` queries

import {
  pgTable, uuid, text, integer, numeric,
  timestamp, json, boolean, pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ─────────────────────────────────────────────────
export const sideEnum = pgEnum('side', ['long', 'short'])
export const envEnum = pgEnum('environment', ['demo', 'live'])
export const gradeEnum = pgEnum('grade', ['A+', 'A', 'B', 'C', 'D'])
export const emotionEnum = pgEnum('emotion', ['calm', 'fomo', 'revenge', 'confident', 'anxious', 'neutral'])
export const challengeStageEnum = pgEnum('challenge_stage', ['evaluation', 'phase2', 'funded', 'failed', 'passed'])
export const firmStatusEnum = pgEnum('firm_status', ['active', 'passed', 'failed', 'paused'])

// ── Users ─────────────────────────────────────────────────
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
}))

// ── Tradovate Accounts ────────────────────────────────────
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

// ── Prop Firms ────────────────────────────────────────────
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

// ── Prop Firm Accounts ────────────────────────────────────
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

// ── Trades ────────────────────────────────────────────────
export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tradovateAccountId: uuid('tradovate_account_id').references(() => tradovateAccounts.id),
  propFirmAccountId: uuid('prop_firm_account_id').references(() => propFirmAccounts.id, { onDelete: 'set null' }),
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
  grade: gradeEnum('grade'),
  emotion: emotionEnum('emotion'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, { fields: [trades.userId], references: [users.id] }),
  propFirmAccount: one(propFirmAccounts, { fields: [trades.propFirmAccountId], references: [propFirmAccounts.id] }),
  tradovateAccount: one(tradovateAccounts, { fields: [trades.tradovateAccountId], references: [tradovateAccounts.id] }),
}))

// ── Types ─────────────────────────────────────────────────
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type TradovateAccount = typeof tradovateAccounts.$inferSelect
export type NewTradovateAccount = typeof tradovateAccounts.$inferInsert
export type PropFirm = typeof propFirms.$inferSelect
export type NewPropFirm = typeof propFirms.$inferInsert
export type PropFirmAccount = typeof propFirmAccounts.$inferSelect
export type NewPropFirmAccount = typeof propFirmAccounts.$inferInsert
export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert