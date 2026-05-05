import { POST } from './fetch'

export async function loginUser(credentials) {
  const session = await POST('/auth/login', credentials)

  if (!session?.accessToken) {
    throw new Error('The login response did not include an access token.')
  }

  return session
}
