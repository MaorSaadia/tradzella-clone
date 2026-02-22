// lib/tradovate/auth.ts

import type { TradovateTokenResponse, TradovateAccount, Environment } from '@/types'

const BASE_URLS: Record<Environment, string> = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1',
}

// ── Core fetch wrapper ────────────────────────────────────
export async function tradovateRequest<T>(
  endpoint: string,
  token: string,
  environment: Environment,
  method: 'GET' | 'POST' = 'GET',
  body?: object
): Promise<T> {
  const res = await fetch(`${BASE_URLS[environment]}/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tradovate API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Request a new access token ────────────────────────────
export async function requestToken(
  username: string,
  password: string,
  environment: Environment
): Promise<TradovateTokenResponse> {
  const res = await fetch(`${BASE_URLS[environment]}/auth/accesstokenrequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: username,
      password,
      appId: 'TradZella',
      appVersion: '1.0',
      deviceId: 'tradzella-server',
      cid: 0,
      sec: '',
    }),
  })

  if (!res.ok) {
    throw new Error('Invalid Tradovate credentials. Please check your username and password.')
  }

  const data = await res.json()

  // Tradovate returns p-ticket error in 200 response if credentials wrong
  if (data['p-ticket']) {
    throw new Error('Invalid Tradovate credentials.')
  }

  if (!data.accessToken) {
    throw new Error('Tradovate did not return an access token.')
  }

  return data
}

// ── Renew an existing token ───────────────────────────────
export async function renewToken(
  token: string,
  environment: Environment
): Promise<TradovateTokenResponse> {
  const res = await fetch(`${BASE_URLS[environment]}/auth/renewaccesstoken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Token renewal failed')
  return res.json()
}

// ── Get all accounts for a user ───────────────────────────
export async function getAccounts(
  token: string,
  environment: Environment
): Promise<TradovateAccount[]> {
  return tradovateRequest<TradovateAccount[]>('account/list', token, environment)
}