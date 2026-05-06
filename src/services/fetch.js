import { clearSession, getStoredSession } from "./session"

const API_BASE_URL = 'http://localhost:5046'
const AUTH_ERROR_CODES = new Set(['EXPIRED_TOKEN', 'INVALID_TOKEN'])

function buildUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalizedPath}`, window.location.origin)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  return url.toString()
}

async function request(path, options = {}) {
  const session = getStoredSession()
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401 && session?.accessToken && AUTH_ERROR_CODES.has(data?.code)) {
    clearSession()
    const loginUrl = new URL('/login', window.location.origin)
    loginUrl.searchParams.set('authError', data.code)
    window.location.replace(loginUrl.toString())
  }

  return data
}

export function GET(path, query) {
  return request(path, { method: 'GET', query })
}

export function POST(path, body) {
  return request(path, { method: 'POST', body })
}

export function PATCH(path, body) {
  return request(path, { method: 'PATCH', body })
}
