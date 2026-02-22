// lib/tradovate/auth.ts

import type { TradovateTokenResponse, TradovateAccount, Environment } from '@/types'

const BASE_URLS: Record<Environment, string> = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1',
}

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
// Requires real cid + sec from Tradovate Settings → API Access
export async function requestToken(
  username: string,
  password: string,
  environment: Environment,
  cid: number,
  sec: string
): Promise<TradovateTokenResponse> {
  const url = `${BASE_URLS[environment]}/auth/accesstokenrequest`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: username,
      password,
      appId: 'TradZella',
      appVersion: '1.0',
      deviceId: 'tradzella-server',
      cid,      // real numeric CID from Tradovate API settings
      sec,      // real UUID secret from Tradovate API settings
    }),
  })

  const data = await res.json()

  // Tradovate returns a p-ticket object when MFA / device approval is needed
  if (data['p-ticket']) {
    throw new Error(
      'Tradovate requires device approval. Please log in to tradovate.com, ' +
      'check your email for a device approval link, approve it, then try again.'
    )
  }

  // Bad credentials return a non-200 with an error message
  if (!res.ok) {
    throw new Error(
      data.errorText ?? data.error ?? 'Invalid Tradovate credentials'
    )
  }

  if (!data.accessToken) {
    throw new Error(
      'Tradovate did not return an access token. ' +
      'Please check your username, password, CID and Secret are all correct.'
    )
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

// ── Get all accounts for the authenticated user ───────────
export async function getAccounts(
  token: string,
  environment: Environment
): Promise<TradovateAccount[]> {
  return tradovateRequest<TradovateAccount[]>('account/list', token, environment)
}