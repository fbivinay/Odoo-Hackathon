import { mockRequest } from './mock'
import { getToken } from './token'

export type Envelope<T> = { ok: true; data: T } | { ok: false; error: string; message: string }

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '/api'
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export async function api<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  if (USE_MOCKS) {
    try {
      return await mockRequest<T>(path, init)
    } catch (e) {
      const err = e as Error & { code?: string }
      throw new ApiError(err.code ?? 'MOCK_ERROR', err.message, 400)
    }
  }

  const { body, headers, ...rest } = init
  const token = getToken()
  const isForm = body instanceof FormData

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
  })

  let payload: Envelope<T>
  try {
    payload = await res.json()
  } catch {
    throw new ApiError('BAD_RESPONSE', 'The server sent a response we could not read.', res.status)
  }

  if (!payload.ok) throw new ApiError(payload.error, payload.message, res.status)
  return payload.data
}
