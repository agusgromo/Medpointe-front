import { GET } from './fetch'

export function getClinicalChart(patientId, query) {
  return GET(`/clinical/patient/${patientId}`, query)
}
