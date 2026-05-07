import { POST } from './fetch'

export async function loginUser(credentials) {
  const session = await POST('/auth/login', credentials)

  return session
}
