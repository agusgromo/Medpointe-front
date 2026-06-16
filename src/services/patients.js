import { GET, PATCH, POST } from './fetch'

export function searchPatients(search) {
  return GET('/patient/search', typeof search === 'string' ? { search } : search)
}

export function getPatientActivity(patientId) {
  return GET(`/patient/${patientId}/activity`)
}

export function getPatientSearchOptions() {
  return GET('/patient/search/options')
}

export function getPreviousPatients() {
  return GET('/patient/previous')
}

export function updatePatientAlert(patientId, alert) {
  return PATCH(`/patient/${patientId}/alert`, { alert })
}

export function getLanguages() {
  return GET('/languages')
}

export function createPatient(patient) {
  return POST('/patient', patient)
}
