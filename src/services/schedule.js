import { GET, PATCH, POST } from './fetch'

export function getSchedule(query) {
  return GET('/schedule', query)
}

export function getScheduleOptions() {
  return GET('/schedule/options')
}

export function createAppointment(appointment) {
  return POST('/schedule/appointments', appointment)
}

export function updateAppointmentStatus(appointmentId, status, note = '') {
  return PATCH(`/schedule/appointments/${appointmentId}/status`, { status, note })
}
