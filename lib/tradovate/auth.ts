// src/lib/tradovate/auth.ts
const URLS = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1',
}

export async function requestToken(
  username: string,
  password: string,
  environment: 'demo' | 'live'
) {
  const baseUrl = URLS[environment]
  const res = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: username,
      password,
      appId: 'TradZella',
      appVersion: '1.0',
      deviceId: 'tradzella-app',
      cid: 0,       // No API key needed for basic access
      sec: '',
    }),
  })
  if (!res.ok) throw new Error('Tradovate authentication failed')
  return res.json()
}

export async function renewToken(
  token: string,
  environment: 'demo' | 'live'
) {
  const baseUrl = URLS[environment]
  const res = await fetch(`${baseUrl}/auth/renewaccesstoken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Token renewal failed')
  return res.json()
}

export async function apiCall<T>(
  endpoint: string,
  token: string,
  environment: 'demo' | 'live'
): Promise<T> {
  const baseUrl = URLS[environment]
  const res = await fetch(`${baseUrl}/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Tradovate API error: ${res.status}`)
  return res.json()
}