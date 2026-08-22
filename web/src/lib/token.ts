const KEY = 'dayflow_token'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token)
}

export function clearToken() {
  localStorage.removeItem(KEY)
}

export interface TokenPayload {
  sub: string
  role: 'EMPLOYEE' | 'HR_ADMIN'
  exp: number
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}
