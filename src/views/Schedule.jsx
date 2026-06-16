import { useCallback, useEffect, useMemo, useState } from 'react'
import MainLayout from '../components/MainLayout'
import { searchPatients } from '../services/patients'
import {
  createAppointment,
  getSchedule,
  getScheduleOptions,
  updateAppointmentStatus,
} from '../services/schedule'

const statusOptions = [
  'scheduled',
  'confirmed',
  'checked_in',
  'triage',
  'with_provider',
  'nurse_order',
  'ready_checkout',
  'checked_out',
  'completed',
  'cancelled',
  'no_show',
]

const emptyOptions = {
  providers: [],
  locations: [],
  rooms: [],
  appointmentTypes: [],
}

function inputDate(value = new Date()) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function humanize(value) {
  if (!value) {
    return ''
  }

  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatTime(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function patientSearchName(patient, includeId = false) {
  if (!patient) {
    return ''
  }

  const baseName = [
    patient.lastName ? `${patient.lastName},` : '',
    patient.firstName,
    patient.middleName,
  ].filter(Boolean).join(' ')

  return includeId ? `${baseName} (#${patient.id})` : baseName
}

function patientSearchDetails(patient) {
  if (!patient) {
    return ''
  }

  return [
    formatDate(patient.dateOfBirth),
    humanize(patient.sexAtBirth),
    patient.mobilePhone,
    patient.primaryProviderName,
    patient.primaryLocationName,
  ].filter(Boolean).join(' | ')
}

function toNumberOrNull(value) {
  return value ? Number(value) : null
}

function makeLocalDateTime(date, time) {
  return new Date(`${date}T${time || '09:00'}:00`).toISOString()
}

function appointmentDuration(appointment) {
  if (!appointment?.scheduledStart || !appointment?.scheduledEnd) {
    return ''
  }

  const start = new Date(appointment.scheduledStart)
  const end = new Date(appointment.scheduledEnd)
  const minutes = Math.max(0, Math.round((end - start) / 60000))
  return minutes ? `${minutes} min` : ''
}

function statusClass(value) {
  return `pa-pill pa-pill--${String(value || '').toLowerCase().replaceAll('_', '-')}`
}

function ScheduleMetric({ label, value, tone = 'default' }) {
  return (
    <div className={`schedule-metric schedule-metric--${tone}`}>
      <div className="schedule-metric-value">{value}</div>
      <div className="schedule-metric-label">{label}</div>
    </div>
  )
}

function ScheduleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a9 9 0 0 1-15.3 6.4" />
      <path d="M3 12A9 9 0 0 1 18.3 5.6" />
      <path d="M18 2v4h-4" />
      <path d="M6 22v-4h4" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(inputDate())
  const [filters, setFilters] = useState({ providerId: '', locationId: '', status: '' })
  const [options, setOptions] = useState(emptyOptions)
  const [appointments, setAppointments] = useState([])
  const [activeAppointmentId, setActiveAppointmentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [patientSearchTerm, setPatientSearchTerm] = useState('')
  const [patientSearchLoading, setPatientSearchLoading] = useState(false)
  const [patientSearchComplete, setPatientSearchComplete] = useState(false)
  const [patientResults, setPatientResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    patientId: '',
    appointmentTypeId: '',
    providerId: '',
    locationId: '',
    roomId: '',
    date: selectedDate,
    time: '09:00',
    durationMinutes: '15',
    reason: '',
    notes: '',
  })

  const filteredRooms = useMemo(() => (
    options.rooms.filter((room) => !form.locationId || String(room.locationId) === String(form.locationId))
  ), [form.locationId, options.rooms])

  const activeAppointment = useMemo(() => (
    appointments.find((appointment) => appointment.id === activeAppointmentId) || appointments[0] || null
  ), [activeAppointmentId, appointments])

  const metrics = useMemo(() => {
    const checkedIn = appointments.filter((appointment) => (
      ['checked_in', 'triage', 'with_provider', 'nurse_order', 'ready_checkout'].includes(appointment.status)
    )).length
    const completed = appointments.filter((appointment) => (
      ['checked_out', 'completed'].includes(appointment.status)
    )).length
    const openBilling = appointments.filter((appointment) => (
      appointment.billingStatus && !['paid', 'voided'].includes(appointment.billingStatus)
    )).length

    return { checkedIn, completed, openBilling }
  }, [appointments])

  const selectedPatientLabel = selectedPatient
    ? patientSearchName(selectedPatient, true)
    : ''
  const patientSearchQuery = patientSearchTerm.trim()
  const canSearchPatients = Boolean(patientSearchQuery)
    && (patientSearchQuery.length >= 2 || /^\d+$/.test(patientSearchQuery))
  const showPatientNoResults = canSearchPatients
    && patientSearchComplete
    && !patientSearchLoading
    && !selectedPatient
    && patientResults.length === 0

  const loadSchedule = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await getSchedule({
        date: selectedDate,
        providerId: filters.providerId,
        locationId: filters.locationId,
        status: filters.status,
      })

      if (response.status === 200 && Array.isArray(response.data)) {
        setAppointments(response.data)
        setActiveAppointmentId((currentId) => {
          if (response.data.some((appointment) => appointment.id === currentId)) {
            return currentId
          }

          return response.data[0]?.id ?? null
        })
      } else {
        setAppointments([])
        setMessage(response.data?.message || 'Unable to load schedule.')
      }
    } catch (error) {
      setAppointments([])
      setMessage(error.message || 'Unable to load schedule.')
    } finally {
      setLoading(false)
    }
  }, [filters.locationId, filters.providerId, filters.status, selectedDate])

  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await getScheduleOptions()

        if (response.status === 200 && response.data) {
          setOptions({
            providers: response.data.providers || [],
            locations: response.data.locations || [],
            rooms: response.data.rooms || [],
            appointmentTypes: response.data.appointmentTypes || [],
          })
        }
      } catch (error) {
        setMessage(error.message || 'Unable to load schedule options.')
      }
    }

    loadOptions()
  }, [])

  useEffect(() => {
    if (!canSearchPatients || !patientSearchQuery || patientSearchTerm === selectedPatientLabel) {
      return undefined
    }

    let ignore = false
    const timeoutId = setTimeout(async () => {
      setPatientSearchLoading(true)

      try {
        const response = await searchPatients(patientSearchQuery)

        if (ignore) {
          return
        }

        if (response.status === 200 && Array.isArray(response.data)) {
          setPatientResults(response.data)
          setPatientSearchComplete(true)
        } else {
          setPatientResults([])
          setPatientSearchComplete(true)
        }
      } catch {
        if (!ignore) {
          setPatientResults([])
          setPatientSearchComplete(true)
        }
      } finally {
        if (!ignore) {
          setPatientSearchLoading(false)
        }
      }
    }, 220)

    return () => {
      ignore = true
      clearTimeout(timeoutId)
    }
  }, [canSearchPatients, patientSearchQuery, patientSearchTerm, selectedPatientLabel])

  useEffect(() => {
    let ignore = false

    async function loadCurrentSchedule() {
      try {
        const response = await getSchedule({
          date: selectedDate,
          providerId: filters.providerId,
          locationId: filters.locationId,
          status: filters.status,
        })

        if (ignore) {
          return
        }

        if (response.status === 200 && Array.isArray(response.data)) {
          setAppointments(response.data)
          setActiveAppointmentId((currentId) => {
            if (response.data.some((appointment) => appointment.id === currentId)) {
              return currentId
            }

            return response.data[0]?.id ?? null
          })
        } else {
          setAppointments([])
          setMessage(response.data?.message || 'Unable to load schedule.')
        }
      } catch (error) {
        if (!ignore) {
          setAppointments([])
          setMessage(error.message || 'Unable to load schedule.')
        }
      }
    }

    loadCurrentSchedule()

    return () => {
      ignore = true
    }
  }, [filters.locationId, filters.providerId, filters.status, selectedDate])

  function changeSelectedDate(value) {
    setSelectedDate(value)
    setForm((current) => ({ ...current, date: value }))
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function updateForm(field, value) {
    if (field === 'appointmentTypeId') {
      const selectedType = options.appointmentTypes.find((type) => String(type.id) === String(value))
      setForm((current) => ({
        ...current,
        appointmentTypeId: value,
        durationMinutes: selectedType?.defaultDurationMinutes
          ? String(selectedType.defaultDurationMinutes)
          : current.durationMinutes,
      }))
      return
    }

    if (field === 'locationId') {
      setForm((current) => ({ ...current, locationId: value, roomId: '' }))
      return
    }

    setForm((current) => ({ ...current, [field]: value }))
  }

  function selectPatient(patient) {
    setSelectedPatient(patient)
    setPatientSearchTerm(patientSearchName(patient, true))
    setPatientResults([])
    setPatientSearchLoading(false)
    setPatientSearchComplete(false)
    setForm((current) => ({ ...current, patientId: String(patient.id) }))
  }

  function clearSelectedPatient() {
    setSelectedPatient(null)
    setPatientSearchTerm('')
    setPatientResults([])
    setPatientSearchLoading(false)
    setPatientSearchComplete(false)
    setForm((current) => ({ ...current, patientId: '' }))
  }

  function updatePatientSearch(value) {
    setPatientSearchTerm(value)
    setPatientSearchComplete(false)

    if (selectedPatient && value !== selectedPatientLabel) {
      setSelectedPatient(null)
      setForm((current) => ({ ...current, patientId: '' }))
    }

    if (!value.trim() || (value.trim().length < 2 && !/^\d+$/.test(value.trim()))) {
      setPatientResults([])
      setPatientSearchLoading(false)
    }
  }

  async function handleCreateAppointment(event) {
    event.preventDefault()

    if (!form.patientId) {
      setMessage('Select a patient before creating an appointment.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await createAppointment({
        patientId: Number(form.patientId),
        appointmentTypeId: toNumberOrNull(form.appointmentTypeId),
        providerId: toNumberOrNull(form.providerId),
        locationId: toNumberOrNull(form.locationId),
        roomId: toNumberOrNull(form.roomId),
        scheduledStart: makeLocalDateTime(form.date, form.time),
        durationMinutes: Number(form.durationMinutes) || 15,
        reason: form.reason,
        notes: form.notes,
      })

      if (response.status === 201 || response.status === 200) {
        setForm((current) => ({
          ...current,
          patientId: '',
          reason: '',
          notes: '',
        }))
        setSelectedPatient(null)
        setPatientSearchTerm('')
        setPatientResults([])
        setPatientSearchLoading(false)
        setPatientSearchComplete(false)

        if (form.date === selectedDate) {
          await loadSchedule()
        } else {
          setSelectedDate(form.date)
        }
      } else {
        setMessage(response.data?.message || 'Unable to create appointment.')
      }
    } catch (error) {
      setMessage(error.message || 'Unable to create appointment.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(appointmentId, status) {
    setMessage('')

    try {
      const response = await updateAppointmentStatus(appointmentId, status)

      if (response.status === 200 && response.data) {
        setAppointments((current) => current.map((appointment) => (
          appointment.id === appointmentId ? response.data : appointment
        )))
      } else {
        setMessage(response.data?.message || 'Unable to update appointment.')
      }
    } catch (error) {
      setMessage(error.message || 'Unable to update appointment.')
    }
  }

  return (
    <MainLayout>
      <section className="schedule-screen">
        <div className="schedule-topbar">
          <div className="schedule-title-block">
            <div className="schedule-title-icon">
              <ScheduleIcon />
            </div>
            <div>
              <h1>Schedule</h1>
              <div className="schedule-subtitle">{formatDate(selectedDate)}</div>
            </div>
          </div>

          <div className="schedule-controls">
            <label>
              <span>Date</span>
              <input
                className="w-input"
                type="date"
                value={selectedDate}
                onChange={(event) => changeSelectedDate(event.target.value)}
              />
            </label>

            <label>
              <span>Provider</span>
              <select
                className="w-input"
                value={filters.providerId}
                onChange={(event) => updateFilter('providerId', event.target.value)}
              >
                <option value="">All</option>
                {options.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Location</span>
              <select
                className="w-input"
                value={filters.locationId}
                onChange={(event) => updateFilter('locationId', event.target.value)}
              >
                <option value="">All</option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select
                className="w-input"
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{humanize(status)}</option>
                ))}
              </select>
            </label>

            <button className="btn-outline schedule-refresh" type="button" onClick={loadSchedule} disabled={loading}>
              <RefreshIcon />
              <span>{loading ? 'Loading' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {message ? <div className="pa-message">{message}</div> : null}

        <div className="schedule-metrics">
          <ScheduleMetric label="Appointments" value={appointments.length} tone="blue" />
          <ScheduleMetric label="In Clinic" value={metrics.checkedIn} tone="green" />
          <ScheduleMetric label="Completed" value={metrics.completed} tone="slate" />
          <ScheduleMetric label="Billing Open" value={metrics.openBilling} tone="amber" />
        </div>

        <div className="schedule-layout">
          <div className="schedule-panel schedule-board">
            <div className="schedule-panel-head">
              <div>
                <div className="schedule-panel-title">Day View</div>
                <div className="schedule-panel-subtitle">{appointments.length} appointments</div>
              </div>
            </div>

            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr
                      className={appointment.id === activeAppointment?.id ? 'is-selected' : ''}
                      key={appointment.id}
                      onClick={() => setActiveAppointmentId(appointment.id)}
                    >
                      <td>
                        <div className="schedule-time">{formatTime(appointment.scheduledStart)}</div>
                        <div className="schedule-cell-sub">{appointmentDuration(appointment)}</div>
                      </td>
                      <td>
                        <div className="schedule-patient">{appointment.patientName || 'Unassigned'}</div>
                        <div className="schedule-cell-sub">
                          #{appointment.patientId || '-'} {appointment.mobilePhone || ''}
                        </div>
                      </td>
                      <td>{appointment.appointmentTypeName || '-'}</td>
                      <td>{appointment.providerName || '-'}</td>
                      <td>{appointment.roomName || appointment.locationName || '-'}</td>
                      <td>
                        <select
                          className="schedule-status-select"
                          value={appointment.status}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleStatusChange(appointment.id, event.target.value)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{humanize(status)}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {appointment.billingStatus ? (
                          <span className={statusClass(appointment.billingStatus)}>{humanize(appointment.billingStatus)}</span>
                        ) : (
                          <span className="schedule-cell-sub">No claim</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && appointments.length === 0 ? (
                <div className="pa-empty">No appointments scheduled.</div>
              ) : null}
            </div>
          </div>

          <aside className="schedule-side">
            <form className="schedule-panel schedule-create" onSubmit={handleCreateAppointment}>
              <div className="schedule-panel-head">
                <div>
                  <div className="schedule-panel-title">New Appointment</div>
                  <div className="schedule-panel-subtitle">Patient search and scheduling</div>
                </div>
                <PlusIcon />
              </div>

              <div className="schedule-form-grid">
                <label className="span-2">
                  <span>Patient</span>
                  <div className="schedule-patient-picker">
                    <input
                      className="w-input"
                      type="text"
                      value={patientSearchTerm}
                      onChange={(event) => updatePatientSearch(event.target.value)}
                      placeholder="Search by account or patient name"
                    />
                    {selectedPatient ? (
                      <button
                        className="btn-outline schedule-picker-clear"
                        type="button"
                        onClick={clearSelectedPatient}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {selectedPatient ? (
                    <div className="schedule-selected-patient">
                      <b>{patientSearchName(selectedPatient, true)}</b>
                      <span>{patientSearchDetails(selectedPatient)}</span>
                    </div>
                  ) : (
                    <div className="schedule-picker-help">
                      {patientSearchLoading
                        ? 'Searching patients...'
                        : 'Search by last name or account number, then choose a patient.'}
                    </div>
                  )}

                  {!selectedPatient && patientResults.length > 0 ? (
                    <div className="schedule-picker-results">
                      {patientResults.map((patient) => (
                        <button
                          className="schedule-picker-row"
                          key={patient.id}
                          type="button"
                          onClick={() => selectPatient(patient)}
                        >
                          <strong>{patientSearchName(patient, true)}</strong>
                          <span>{patientSearchDetails(patient)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showPatientNoResults ? (
                    <div className="schedule-picker-help">No matching patients found.</div>
                  ) : null}
                </label>

                <label>
                  <span>Type</span>
                  <select
                    className="w-input"
                    value={form.appointmentTypeId}
                    onChange={(event) => updateForm('appointmentTypeId', event.target.value)}
                  >
                    <option value="">Appointment</option>
                    {options.appointmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Date</span>
                  <input
                    className="w-input"
                    type="date"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    required
                  />
                </label>

                <label>
                  <span>Time</span>
                  <input
                    className="w-input"
                    type="time"
                    value={form.time}
                    onChange={(event) => updateForm('time', event.target.value)}
                    required
                  />
                </label>

                <label>
                  <span>Duration</span>
                  <input
                    className="w-input"
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={form.durationMinutes}
                    onChange={(event) => updateForm('durationMinutes', event.target.value)}
                  />
                </label>

                <label>
                  <span>Provider</span>
                  <select
                    className="w-input"
                    value={form.providerId}
                    onChange={(event) => updateForm('providerId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {options.providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>{provider.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Location</span>
                  <select
                    className="w-input"
                    value={form.locationId}
                    onChange={(event) => updateForm('locationId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {options.locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Room</span>
                  <select
                    className="w-input"
                    value={form.roomId}
                    onChange={(event) => updateForm('roomId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {filteredRooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </label>

                <label className="span-2">
                  <span>Reason</span>
                  <input
                    className="w-input"
                    type="text"
                    value={form.reason}
                    onChange={(event) => updateForm('reason', event.target.value)}
                  />
                </label>

                <label className="span-2">
                  <span>Notes</span>
                  <textarea
                    className="w-input schedule-textarea"
                    value={form.notes}
                    onChange={(event) => updateForm('notes', event.target.value)}
                  />
                </label>
              </div>

              <button className="w-button schedule-submit" type="submit" disabled={saving || !form.patientId}>
                {saving ? 'Saving' : 'Create Appointment'}
              </button>
            </form>

            <div className="schedule-panel schedule-detail">
              <div className="schedule-panel-head">
                <div>
                  <div className="schedule-panel-title">Appointment</div>
                  <div className="schedule-panel-subtitle">{activeAppointment ? `#${activeAppointment.id}` : '-'}</div>
                </div>
              </div>

              {activeAppointment ? (
                <div className="schedule-detail-list">
                  <div>
                    <span>Patient</span>
                    <b>{activeAppointment.patientName || 'Unassigned'}</b>
                  </div>
                  <div>
                    <span>Time</span>
                    <b>{formatTime(activeAppointment.scheduledStart)} - {formatTime(activeAppointment.scheduledEnd)}</b>
                  </div>
                  <div>
                    <span>Status</span>
                    <b>{humanize(activeAppointment.status)}</b>
                  </div>
                  <div>
                    <span>Provider</span>
                    <b>{activeAppointment.providerName || '-'}</b>
                  </div>
                  <div>
                    <span>Location</span>
                    <b>{activeAppointment.locationName || '-'}</b>
                  </div>
                  <div>
                    <span>Reason</span>
                    <b>{activeAppointment.reason || '-'}</b>
                  </div>
                  <div>
                    <span>Billing</span>
                    <b>{activeAppointment.billingStatus ? humanize(activeAppointment.billingStatus) : 'No claim'}</b>
                  </div>
                </div>
              ) : (
                <div className="pa-empty">Select an appointment.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  )
}
