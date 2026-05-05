export function getStoredSession() {
  try {
    return JSON.parse(sessionStorage.getItem("medpointe_auth") || 'null')
  } catch {
    return null
  }
}

export function saveSession(session) {
  sessionStorage.setItem("medpointe_auth", JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem("medpointe_auth")
}
