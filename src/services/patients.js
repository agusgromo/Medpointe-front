import { GET } from './fetch'

export function searchPatients(search) {
  return GET('/patient/search', { search })
}

export function getPatientActivity(patientId) {
  return GET(`/patient/${patientId}/activity`)
}
