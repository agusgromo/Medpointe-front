import { GET, POST } from './fetch'

export function getDashboardContext() {
  return GET('/auth/dashboard-context')
}

export async function loginUser(credentials) {
  const session = await POST('/auth/login', credentials)

  return session
}
