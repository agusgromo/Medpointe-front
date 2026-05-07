import { GET, POST } from './fetch'

export function searchPatients(search) {
  return GET('/patient/search', { search })
}

export function getPatientActivity(patientId) {
  return GET(`/patient/${patientId}/activity`)
}

export function getLanguages() {
  return GET('/languages')
}

export function createPatient(patient) {
  return POST('/patient', patient)
}