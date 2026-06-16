import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { cn, statusPillClasses, ui } from '../components/ui'
import { getPreviousPatients, searchPatients } from '../services/patients'
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

function ScheduleMetric({ label, value, tone = 'default' }) {
  const toneClass = {
    blue: 'border-l-[#4190f5]',
    green: 'border-l-[#10b981]',
    slate: 'border-l-[#475569]',
    amber: 'border-l-[#f59e0b]',
    default: 'border-l-[#94a3b8]',
  }[tone] || 'border-l-[#94a3b8]'

  return (
    <div className={cn('min-w-0 rounded-lg border border-mp-line border-l-[5px] bg-white p-3.5', toneClass)}>
      <div className="text-[28px] leading-none font-extrabold text-mp-strong">{value}</div>
      <div className="mt-1.5 text-xs font-extrabold uppercase text-[#64748b]">{label}</div>
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

function PatientPickerModal({ onClose, onCreateNew, onSelectPatient }) {
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const selectedPatient = patients.find((patient) => String(patient.id) === String(selectedPatientId)) || null

  const loadPrevious = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await getPreviousPatients()

      if (response.status !== 200 || !Array.isArray(response.data)) {
        setPatients([])
        setSelectedPatientId(null)
        setMessage(response?.data?.message || 'Unable to load previously opened patients.')
        return
      }

      setPatients(response.data)
      setSelectedPatientId(response.data[0]?.id ?? null)

      if (response.data.length === 0) {
        setMessage('No previously opened patients.')
      }
    } catch (error) {
      setPatients([])
      setSelectedPatientId(null)
      setMessage(error.message || 'Unable to load previously opened patients.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSearch = useCallback(async (searchValue) => {
    const trimmed = String(searchValue || '').trim()

    if (!trimmed) {
      await loadPrevious()
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await searchPatients(trimmed)

      if (response.status !== 200 || !Array.isArray(response.data)) {
        setPatients([])
        setSelectedPatientId(null)
        setMessage(response?.data?.message || 'Unable to search patients.')
        return
      }

      setPatients(response.data)
      setSelectedPatientId(response.data[0]?.id ?? null)

      if (response.data.length === 0) {
        setMessage('No matching patients found.')
      }
    } catch (error) {
      setPatients([])
      setSelectedPatientId(null)
      setMessage(error.message || 'Unable to search patients.')
    } finally {
      setLoading(false)
    }
  }, [loadPrevious])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPrevious()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPrevious])

  function handleSubmit(event) {
    event.preventDefault()
    void loadSearch(query)
  }

  function handleUseSelected() {
    if (!selectedPatient) {
      setMessage('Select a patient first.')
      return
    }

    onSelectPatient(selectedPatient)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/30 p-5 max-[520px]:items-stretch max-[520px]:p-2.5">
      <section className="max-h-[calc(100vh-40px)] w-full max-w-[760px] overflow-auto rounded-lg border border-[#d9e2ea] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] max-[520px]:max-h-[calc(100vh-20px)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf2f7] px-[18px] py-4 max-[520px]:px-3.5">
          <div>
            <h2 className="m-0 text-[22px] font-extrabold text-mp-strong">Select Patient</h2>
            <p className="mt-[3px] mb-0 text-sm text-[#64748b]">Search or choose a previously opened patient</p>
          </div>
          <button className={ui.iconButton} type="button" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 px-[18px] py-4 max-[520px]:px-3.5">
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <div className="grid items-end gap-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className={ui.label}>
                <span>Search</span>
                <input
                  className={ui.input}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search: last,first | acct | DOB"
                />
              </label>
              <button className={cn(ui.secondaryButton, 'min-h-10 whitespace-nowrap max-md:w-full')} type="button" onClick={() => void loadPrevious()}>
                Previous
              </button>
              <button className={cn(ui.primaryButton, 'min-h-10 whitespace-nowrap max-md:w-full')} type="submit" disabled={loading}>
                {loading ? 'Loading' : 'Go'}
              </button>
            </div>
          </form>

          {message ? <div className={ui.message}>{message}</div> : null}

          <div className="overflow-hidden rounded-lg border border-mp-line bg-white">
            <div className="grid grid-cols-[minmax(0,1.6fr)_132px_88px_96px] gap-0 border-b border-mp-line bg-[#f8fafc] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b] max-[760px]:hidden">
              <div>Name</div>
              <div>DOB</div>
              <div>Sex</div>
              <div>Acct</div>
            </div>

            <div className="max-h-[360px] overflow-auto">
              {patients.length ? (
                patients.map((patient) => {
                  const isSelected = String(patient.id) === String(selectedPatientId)

                  return (
                    <button
                      type="button"
                      className={cn(
                        'grid w-full grid-cols-[minmax(0,1.6fr)_132px_88px_96px] items-center gap-0 border-t border-[#eef2f7] px-3 py-3 text-left text-sm text-mp-text first:border-t-0 hover:bg-[#f8fbff] max-[760px]:grid-cols-1 max-[760px]:gap-1',
                        isSelected ? 'bg-[#eef5ff]' : 'bg-white',
                      )}
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      onDoubleClick={() => {
                        onSelectPatient(patient)
                        onClose()
                      }}
                    >
                      <div className="min-w-0 font-extrabold text-mp-strong [overflow-wrap:anywhere]">
                        {patientSearchName(patient)}
                      </div>
                      <div className="text-[#475569] max-[760px]:text-xs max-[760px]:font-semibold max-[760px]:uppercase max-[760px]:text-[#64748b]">{formatDate(patient.dateOfBirth) || '-'}</div>
                      <div className="text-[#475569] max-[760px]:text-xs max-[760px]:font-semibold max-[760px]:uppercase max-[760px]:text-[#64748b]">{humanize(patient.sexAtBirth) || '-'}</div>
                      <div className="text-[#475569] max-[760px]:text-xs max-[760px]:font-semibold max-[760px]:uppercase max-[760px]:text-[#64748b]">{patient.id || '-'}</div>
                    </button>
                  )
                })
              ) : (
                <div className={ui.empty}>{loading ? 'Loading...' : 'No results'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#edf2f7] bg-[#fbfdff] px-[18px] py-4 max-[520px]:px-3.5">
          <button className={ui.secondaryButton} type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={ui.secondaryButton} type="button" onClick={onCreateNew}>
            New Patient
          </button>
          <button className={cn(ui.primaryButton, 'ml-auto')} type="button" onClick={handleUseSelected}>
            Use Patient
          </button>
        </div>
      </section>
    </div>
  )
}

export default function Schedule() {
  const navigate = useNavigate()
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
  const [isPatientPickerOpen, setIsPatientPickerOpen] = useState(false)
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

  function openPatientActivity(patientId) {
    if (!patientId) {
      return
    }

    navigate(`/patient-activity?patientId=${patientId}`)
  }

  function openNewPatientFlow() {
    setIsPatientPickerOpen(false)
    navigate('/patient-activity?action=new')
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
      <section className="grid w-full gap-4">
        {isPatientPickerOpen ? (
          <PatientPickerModal
            onClose={() => setIsPatientPickerOpen(false)}
            onCreateNew={openNewPatientFlow}
            onSelectPatient={selectPatient}
          />
        ) : null}

        <div className="grid gap-4 rounded-lg border border-mp-line bg-white p-3.5 lg:flex lg:items-end lg:justify-between">
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#2563eb] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8] [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
              <ScheduleIcon />
            </div>
            <div>
              <h1 className="m-0 text-2xl leading-tight font-extrabold text-mp-strong">Schedule</h1>
              <div className="text-xs text-[#64748b]">{formatDate(selectedDate)}</div>
            </div>
          </div>

          <div className="grid w-full items-end gap-2.5 md:grid-cols-2 lg:w-full lg:max-w-[980px] lg:grid-cols-[minmax(150px,0.9fr)_minmax(160px,1fr)_minmax(150px,1fr)_minmax(140px,0.8fr)_auto]">
            <label className={ui.label}>
              <span>Date</span>
              <input
                className={ui.input}
                type="date"
                value={selectedDate}
                onChange={(event) => changeSelectedDate(event.target.value)}
              />
            </label>

            <label className={ui.label}>
              <span>Provider</span>
              <select
                className={ui.input}
                value={filters.providerId}
                onChange={(event) => updateFilter('providerId', event.target.value)}
              >
                <option value="">All</option>
                {options.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </label>

            <label className={ui.label}>
              <span>Location</span>
              <select
                className={ui.input}
                value={filters.locationId}
                onChange={(event) => updateFilter('locationId', event.target.value)}
              >
                <option value="">All</option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </label>

            <label className={ui.label}>
              <span>Status</span>
              <select
                className={ui.input}
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{humanize(status)}</option>
                ))}
              </select>
            </label>

            <button className={cn(ui.secondaryButton, 'whitespace-nowrap max-md:w-full')} type="button" onClick={loadSchedule} disabled={loading}>
              <RefreshIcon />
              <span>{loading ? 'Loading' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {message ? <div className={ui.message}>{message}</div> : null}

        <div className="grid gap-3 max-[520px]:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <ScheduleMetric label="Appointments" value={appointments.length} tone="blue" />
          <ScheduleMetric label="In Clinic" value={metrics.checkedIn} tone="green" />
          <ScheduleMetric label="Completed" value={metrics.completed} tone="slate" />
          <ScheduleMetric label="Billing Open" value={metrics.openBilling} tone="amber" />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <div className={ui.panel}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className={ui.sectionTitle}>Day View</div>
                <div className={ui.sectionSubtitle}>{appointments.length} appointments</div>
              </div>
            </div>

            <div className="overflow-auto rounded-lg border border-[#edf2f7]">
              <table className="min-w-[900px] w-full border-collapse">
                <thead>
                  <tr>
                    {['Time', 'Patient', 'Type', 'Provider', 'Room', 'Status', 'Billing'].map((heading) => (
                      <th
                        key={heading}
                        className="sticky top-0 z-[1] bg-slate-50 px-3 py-2.5 text-left text-xs font-extrabold uppercase text-slate-600"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr
                      className={cn(
                        'cursor-pointer border-b border-[#eef2f7] hover:bg-[#f2f7ff]',
                        appointment.id === activeAppointment?.id ? 'bg-[#f2f7ff]' : '',
                      )}
                      key={appointment.id}
                      onClick={() => setActiveAppointmentId(appointment.id)}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <div className="font-extrabold text-mp-strong">{formatTime(appointment.scheduledStart)}</div>
                        <div className="text-xs text-[#64748b]">{appointmentDuration(appointment)}</div>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        {appointment.patientId ? (
                          <button
                            className="font-extrabold text-[#2563eb]"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openPatientActivity(appointment.patientId)
                            }}
                          >
                            {appointment.patientName || 'Unassigned'}
                          </button>
                        ) : (
                          <div className="font-extrabold text-mp-strong">{appointment.patientName || 'Unassigned'}</div>
                        )}
                        <div className="text-xs text-[#64748b]">
                          #{appointment.patientId || '-'} {appointment.mobilePhone || ''}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-middle">{appointment.appointmentTypeName || '-'}</td>
                      <td className="px-3 py-2.5 align-middle">{appointment.providerName || '-'}</td>
                      <td className="px-3 py-2.5 align-middle">{appointment.roomName || appointment.locationName || '-'}</td>
                      <td className="px-3 py-2.5 align-middle">
                        <select
                          className="min-h-[34px] min-w-[140px] rounded-lg border border-[#d9e2ea] bg-white px-2.5 font-bold text-mp-strong"
                          value={appointment.status}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleStatusChange(appointment.id, event.target.value)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{humanize(status)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        {appointment.billingStatus ? (
                          <span className={statusPillClasses(appointment.billingStatus)}>{humanize(appointment.billingStatus)}</span>
                        ) : (
                          <span className="text-xs text-[#64748b]">No claim</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && appointments.length === 0 ? (
                <div className={ui.empty}>No appointments scheduled.</div>
              ) : null}
            </div>
          </div>

          <aside className="grid gap-4 min-w-0">
            <form className={ui.panel} onSubmit={handleCreateAppointment}>
              <div className="mb-3 flex items-center justify-between gap-3 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8] [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
                <div>
                  <div className={ui.sectionTitle}>New Appointment</div>
                  <div className={ui.sectionSubtitle}>Patient search and scheduling</div>
                </div>
              <PlusIcon />
              </div>

              <div className="grid gap-3 max-[520px]:grid-cols-1 md:grid-cols-2">
                <label className={cn(ui.label, 'md:col-span-2')}>
                  <span>Patient</span>
                  <div className="grid items-center gap-2 max-[520px]:grid-cols-1 [grid-template-columns:minmax(0,1fr)_auto_auto]">
                    <input
                      className={ui.input}
                      type="text"
                      value={patientSearchTerm}
                      onChange={(event) => updatePatientSearch(event.target.value)}
                      placeholder="Search by account or patient name"
                    />
                    <button
                      className={cn(ui.secondaryButton, 'min-h-10 whitespace-nowrap max-[520px]:w-full')}
                      type="button"
                      onClick={() => setIsPatientPickerOpen(true)}
                    >
                      Patient Picker
                    </button>
                    {selectedPatient ? (
                      <button
                        className={cn(ui.secondaryButton, 'min-h-10 whitespace-nowrap max-[520px]:w-full')}
                        type="button"
                        onClick={clearSelectedPatient}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {selectedPatient ? (
                    <div className="grid gap-1 rounded-lg border border-[#dbe7f2] bg-[#f8fbff] px-3 py-2.5">
                      <b className="text-[13px] font-extrabold text-mp-strong">{patientSearchName(selectedPatient, true)}</b>
                      <span className="text-xs text-[#64748b]">{patientSearchDetails(selectedPatient)}</span>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#64748b]">
                      {patientSearchLoading
                        ? 'Searching patients...'
                        : 'Search by last name or account number, then choose a patient.'}
                    </div>
                  )}

                  {!selectedPatient && patientResults.length > 0 ? (
                    <div className="mt-2 grid max-h-[220px] gap-2 overflow-auto">
                      {patientResults.map((patient) => (
                        <button
                          className="grid gap-[3px] rounded-lg border border-mp-line bg-white px-3 py-2.5 text-left text-mp-text transition hover:bg-[#eef5ff]"
                          key={patient.id}
                          type="button"
                          onClick={() => selectPatient(patient)}
                        >
                          <strong className="text-[13px] font-extrabold text-mp-strong">{patientSearchName(patient, true)}</strong>
                          <span className="text-xs text-[#64748b]">{patientSearchDetails(patient)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showPatientNoResults ? (
                    <div className="text-xs font-semibold text-[#64748b]">No matching patients found.</div>
                  ) : null}
                </label>

                <label className={ui.label}>
                  <span>Type</span>
                  <select
                    className={ui.input}
                    value={form.appointmentTypeId}
                    onChange={(event) => updateForm('appointmentTypeId', event.target.value)}
                  >
                    <option value="">Appointment</option>
                    {options.appointmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </label>

                <label className={ui.label}>
                  <span>Date</span>
                  <input
                    className={ui.input}
                    type="date"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    required
                  />
                </label>

                <label className={ui.label}>
                  <span>Time</span>
                  <input
                    className={ui.input}
                    type="time"
                    value={form.time}
                    onChange={(event) => updateForm('time', event.target.value)}
                    required
                  />
                </label>

                <label className={ui.label}>
                  <span>Duration</span>
                  <input
                    className={ui.input}
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={form.durationMinutes}
                    onChange={(event) => updateForm('durationMinutes', event.target.value)}
                  />
                </label>

                <label className={ui.label}>
                  <span>Provider</span>
                  <select
                    className={ui.input}
                    value={form.providerId}
                    onChange={(event) => updateForm('providerId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {options.providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>{provider.name}</option>
                    ))}
                  </select>
                </label>

                <label className={ui.label}>
                  <span>Location</span>
                  <select
                    className={ui.input}
                    value={form.locationId}
                    onChange={(event) => updateForm('locationId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {options.locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </label>

                <label className={ui.label}>
                  <span>Room</span>
                  <select
                    className={ui.input}
                    value={form.roomId}
                    onChange={(event) => updateForm('roomId', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {filteredRooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </label>

                <label className={cn(ui.label, 'md:col-span-2')}>
                  <span>Reason</span>
                  <input
                    className={ui.input}
                    type="text"
                    value={form.reason}
                    onChange={(event) => updateForm('reason', event.target.value)}
                  />
                </label>

                <label className={cn(ui.label, 'md:col-span-2')}>
                  <span>Notes</span>
                  <textarea
                    className={ui.textarea}
                    value={form.notes}
                    onChange={(event) => updateForm('notes', event.target.value)}
                  />
                </label>
              </div>

              <button className={cn(ui.primaryButton, 'mt-3 w-full')} type="submit" disabled={saving || !form.patientId}>
                {saving ? 'Saving' : 'Create Appointment'}
              </button>
            </form>

            <div className={ui.panel}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className={ui.sectionTitle}>Appointment</div>
                  <div className={ui.sectionSubtitle}>{activeAppointment ? `#${activeAppointment.id}` : '-'}</div>
                </div>
              </div>

              {activeAppointment ? (
                <div className="grid gap-2.5">
                  {[
                    ['Patient', activeAppointment.patientName || 'Unassigned'],
                    ['Time', `${formatTime(activeAppointment.scheduledStart)} - ${formatTime(activeAppointment.scheduledEnd)}`],
                    ['Status', humanize(activeAppointment.status)],
                    ['Provider', activeAppointment.providerName || '-'],
                    ['Location', activeAppointment.locationName || '-'],
                    ['Reason', activeAppointment.reason || '-'],
                    ['Billing', activeAppointment.billingStatus ? humanize(activeAppointment.billingStatus) : 'No claim'],
                  ].map(([label, value], index) => (
                    <div
                      key={label}
                      className={cn(
                        'grid gap-2 pt-2.5 [grid-template-columns:minmax(86px,0.65fr)_minmax(0,1fr)]',
                        index === 0 ? 'border-t-0 pt-0' : 'border-t border-[#eef2f7]',
                      )}
                    >
                      <span className="text-xs font-extrabold uppercase text-[#64748b]">{label}</span>
                      <b className="min-w-0 font-bold text-mp-strong [overflow-wrap:anywhere]">{value}</b>
                    </div>
                  ))}
                  {activeAppointment.patientId ? (
                    <button
                      className={cn(ui.secondaryButton, 'mt-2')}
                      type="button"
                      onClick={() => openPatientActivity(activeAppointment.patientId)}
                    >
                      Open Patient Activity
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className={ui.empty}>Select an appointment.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  )
}