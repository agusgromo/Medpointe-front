import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { cn, statusPillClasses, ui } from '../components/ui'
import avatar from '../assets/patient-avatar.png'
import { getClinicalChart } from '../services/clinical'
import { getPreviousPatients, searchPatients } from '../services/patients'
import { getSchedule, getScheduleOptions } from '../services/schedule'

const CLINICAL_OFFICE_KEY = 'medpointe.clinical.officeId'
const CLINICAL_PROVIDER_KEY = 'medpointe.clinical.providerId'
const CLINICAL_DATE_KEY = 'medpointe.clinical.date'

const mainTabs = ['Overview', "Today's Note", 'History', 'Orders', 'Flowsheets']
const historyTabs = ['Past Medical Hx', 'Encounters', 'Family Hx', 'Social Hx']
const medicationFilters = ['active', 'stopped', 'all']

function parseId(value) {
  if (!value) {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
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

function formatTime(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  return Number(value).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })
}

function ageText(dateOfBirth) {
  if (!dateOfBirth) {
    return ''
  }

  const dob = new Date(dateOfBirth)
  const today = new Date()
  let years = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    years -= 1
  }

  return `${years}y`
}

function clinicalDisplayName(person) {
  if (!person) {
    return ''
  }

  const leading = person.lastName ? `${person.lastName},` : ''
  return [leading, person.firstName, person.middleName, person.suffix].filter(Boolean).join(' ')
}

function patientSearchName(patient) {
  if (!patient) {
    return ''
  }

  const leading = patient.lastName ? `${patient.lastName},` : ''
  return [leading, patient.firstName, patient.middleName].filter(Boolean).join(' ')
}

function addressText(contact) {
  if (!contact) {
    return ''
  }

  return [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state, contact.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean).join(' ')
}

function vitalsText(visit) {
  const values = []

  if (visit?.systolicBp && visit?.diastolicBp) {
    values.push(`BP ${Math.round(visit.systolicBp)}/${Math.round(visit.diastolicBp)}`)
  }

  if (visit?.heartRate) {
    values.push(`HR ${Math.round(visit.heartRate)}`)
  }

  if (visit?.bmi) {
    values.push(`BMI ${Number(visit.bmi).toFixed(1)}`)
  }

  if (visit?.painScore !== null && visit?.painScore !== undefined) {
    values.push(`Pain ${visit.painScore}`)
  }

  return values.join(' | ')
}

function appointmentGlyph(appointment) {
  const status = String(appointment?.status || '').toLowerCase()

  if (appointment?.signedAt) {
    return { glyph: '✓', tone: 'text-slate-700' }
  }

  if (['completed', 'checked_out'].includes(status) || appointment?.checkedOutAt) {
    return { glyph: '✓', tone: 'text-emerald-600' }
  }

  if (['ready_checkout', 'with_provider', 'nurse_order'].includes(status) || appointment?.providerStartedAt || appointment?.encounterClosedAt) {
    return { glyph: '◆', tone: 'text-sky-600' }
  }

  if (['triage', 'checked_in'].includes(status) || appointment?.triagedAt || appointment?.checkedInAt) {
    return { glyph: '▶', tone: 'text-amber-500' }
  }

  if (status === 'confirmed' || appointment?.confirmedAt) {
    return { glyph: '■', tone: 'text-emerald-600' }
  }

  if (['cancelled', 'no_show'].includes(status)) {
    return { glyph: '✕', tone: 'text-rose-600' }
  }

  return { glyph: '•', tone: 'text-slate-400' }
}

function selectedProblemKey(problem) {
  if (problem?.patientProblemId) {
    return `problem-${problem.patientProblemId}`
  }

  if (problem?.diagnosisCode) {
    return `code-${String(problem.diagnosisCode).trim().toUpperCase()}`
  }

  return `sequence-${problem?.sequence ?? '0'}`
}

function cardTitleClasses(isActive) {
  return cn(
    'inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-bold transition',
    isActive
      ? 'border-[#cfe7ff] bg-[#e9f5ff] text-[#2563eb]'
      : 'border-[#d7e1ea] bg-white text-[#64748b] hover:border-sky-200 hover:text-[#2563eb]',
  )
}

function StatusPill({ value }) {
  if (!value) {
    return null
  }

  return <span className={statusPillClasses(value)}>{humanize(value)}</span>
}

function EmptyState({ message }) {
  return <div className={ui.empty}>{message}</div>
}

function Card({ title, action, children, className = '' }) {
  return (
    <section className={cn(ui.panel, className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0 text-base font-extrabold text-mp-strong">{title}</h3>
        {action || null}
      </div>
      {children}
    </section>
  )
}

function SummaryBlock({ title, rows, accent }) {
  const accentClass = {
    blue: 'border-t-[#4190f5]',
    green: 'border-t-[#10b981]',
    amber: 'border-t-[#f59e0b]',
    red: 'border-t-[#ef4444]',
    slate: 'border-t-[#94a3b8]',
  }[accent] || 'border-t-[#94a3b8]'

  return (
    <section className={cn(ui.panel, 'border-t-4 p-3.5', accentClass)}>
      <h3 className="m-0 text-sm font-extrabold uppercase tracking-[0.02em] text-[#475569]">{title}</h3>
      <div className="mt-3 grid gap-2.5">
        {rows.map(([label, value]) => (
          <div className="grid gap-1.5" key={label}>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#7a8798]">{label}</div>
            <div className="min-w-0 text-sm font-semibold text-mp-strong [overflow-wrap:anywhere]">{value || '-'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ClinicalPatientSearchModal({ onClose, onSelectPatient }) {
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

  const performSearch = useCallback(async (searchValue) => {
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
    void performSearch(query)
  }

  function handleOpenSelected() {
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
            <h2 className="m-0 text-[22px] font-extrabold text-mp-strong">Find Patient</h2>
            <p className="mt-[3px] mb-0 text-sm text-[#64748b]">Search clinical charts or reopen a recent patient</p>
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
                {loading ? 'Loading' : 'Search'}
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

          <div className="flex items-center justify-end gap-3 border-t border-[#edf2f7] pt-4">
            <button className={ui.secondaryButton} type="button" onClick={onClose}>
              Close
            </button>
            <button className={ui.primaryButton} type="button" onClick={handleOpenSelected}>
              Open Chart
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Clinical() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const routePatientId = parseId(searchParams.get('patientId'))
  const routeAppointmentId = parseId(searchParams.get('appointmentId'))
  const routeDate = searchParams.get('date')
  const routeLocationId = searchParams.get('locationId') || ''
  const routeProviderId = searchParams.get('providerId') || ''

  const [options, setOptions] = useState({ providers: [], locations: [], rooms: [], appointmentTypes: [] })
  const [selectedDate, setSelectedDate] = useState(() => routeDate || localStorage.getItem(CLINICAL_DATE_KEY) || inputDate())
  const [selectedLocationId, setSelectedLocationId] = useState(() => routeLocationId || localStorage.getItem(CLINICAL_OFFICE_KEY) || '')
  const [selectedProviderId, setSelectedProviderId] = useState(() => routeProviderId || localStorage.getItem(CLINICAL_PROVIDER_KEY) || '')
  const [scheduleRows, setScheduleRows] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [scheduleMessage, setScheduleMessage] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(() => (routeAppointmentId ? String(routeAppointmentId) : ''))
  const [chart, setChart] = useState(null)
  const [loadingChart, setLoadingChart] = useState(false)
  const [chartMessage, setChartMessage] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [activeHistoryTab, setActiveHistoryTab] = useState('Past Medical Hx')
  const [selectedInsuranceId, setSelectedInsuranceId] = useState('')
  const [medicationFilter, setMedicationFilter] = useState('active')
  const [ordersCurrentVisitOnly, setOrdersCurrentVisitOnly] = useState(true)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)

  const selectedInsurance = useMemo(
    () => chart?.insurancePolicies?.find((policy) => String(policy.id) === String(selectedInsuranceId))
      || chart?.insurancePolicies?.[0]
      || null,
    [chart, selectedInsuranceId],
  )

  const selectedProblemKeys = useMemo(
    () => new Set((chart?.encounterDiagnoses || []).map(selectedProblemKey)),
    [chart],
  )

  const filteredMedications = useMemo(() => {
    const medications = Array.isArray(chart?.medications) ? chart.medications : []

    if (medicationFilter === 'all') {
      return medications
    }

    if (medicationFilter === 'stopped') {
      return medications.filter((medication) => String(medication.status || '').toLowerCase() === 'stopped')
    }

    return medications.filter((medication) => String(medication.status || '').toLowerCase() === 'active')
  }, [chart, medicationFilter])

  const filteredOrders = useMemo(() => {
    const orders = Array.isArray(chart?.orders) ? chart.orders : []

    if (!ordersCurrentVisitOnly || !chart?.currentVisit?.id) {
      return orders
    }

    return orders.filter((order) => String(order.visitId || '') === String(chart.currentVisit.id))
  }, [chart, ordersCurrentVisitOnly])

  const primaryPharmacy = chart?.pharmacies?.[0] || null
  const patient = chart?.patient || null
  const contact = chart?.contact || null
  const selectedRow = scheduleRows.find((row) => String(row.id) === String(selectedAppointmentId)) || null

  const writeRouteState = useCallback((patientId, appointmentId = null) => {
    const params = new URLSearchParams()

    if (selectedDate) {
      params.set('date', selectedDate)
    }

    if (selectedLocationId) {
      params.set('locationId', selectedLocationId)
    }

    if (selectedProviderId) {
      params.set('providerId', selectedProviderId)
    }

    if (patientId) {
      params.set('patientId', String(patientId))
    }

    if (appointmentId) {
      params.set('appointmentId', String(appointmentId))
    }

    navigate({ pathname: '/clinical', search: params.toString() }, { replace: true })
  }, [navigate, selectedDate, selectedLocationId, selectedProviderId])

  const loadChart = useCallback(async (patientId, appointmentId = null) => {
    if (!patientId) {
      setChart(null)
      setSelectedAppointmentId('')
      setChartMessage('Select a patient from the clinical schedule.')
      return
    }

    setLoadingChart(true)
    setChartMessage('')

    try {
      const response = await getClinicalChart(patientId, appointmentId ? { appointmentId } : undefined)

      if (response.status !== 200 || !response.data) {
        setChart(null)
        setSelectedAppointmentId(appointmentId ? String(appointmentId) : '')
        setChartMessage(response?.data?.message || 'Unable to load the clinical chart.')
        return
      }

      setChart(response.data)
      setSelectedAppointmentId(appointmentId ? String(appointmentId) : '')
      setSelectedInsuranceId(response.data.insurancePolicies?.[0]?.id ? String(response.data.insurancePolicies[0].id) : '')
      setMedicationFilter('active')
      setOrdersCurrentVisitOnly(true)
      writeRouteState(response.data.patient?.id, appointmentId)
    } catch (error) {
      setChart(null)
      setSelectedAppointmentId(appointmentId ? String(appointmentId) : '')
      setChartMessage(error.message || 'Unable to load the clinical chart.')
    } finally {
      setLoadingChart(false)
    }
  }, [writeRouteState])

  useEffect(() => {
    localStorage.setItem(CLINICAL_DATE_KEY, selectedDate)
  }, [selectedDate])

  useEffect(() => {
    if (selectedLocationId) {
      localStorage.setItem(CLINICAL_OFFICE_KEY, selectedLocationId)
    }
  }, [selectedLocationId])

  useEffect(() => {
    localStorage.setItem(CLINICAL_PROVIDER_KEY, selectedProviderId)
  }, [selectedProviderId])

  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await getScheduleOptions()

        if (response.status !== 200 || !response.data) {
          setOptions({ providers: [], locations: [], rooms: [], appointmentTypes: [] })
          return
        }

        const nextOptions = {
          providers: Array.isArray(response.data.providers) ? response.data.providers : [],
          locations: Array.isArray(response.data.locations) ? response.data.locations : [],
          rooms: Array.isArray(response.data.rooms) ? response.data.rooms : [],
          appointmentTypes: Array.isArray(response.data.appointmentTypes) ? response.data.appointmentTypes : [],
        }

        setOptions(nextOptions)

        if (!selectedLocationId && nextOptions.locations[0]?.id) {
          setSelectedLocationId(String(nextOptions.locations[0].id))
        }
      } catch {
        setOptions({ providers: [], locations: [], rooms: [], appointmentTypes: [] })
      }
    }

    loadOptions()
  }, [selectedLocationId])

  useEffect(() => {
    async function loadClinicalSchedule() {
      setLoadingSchedule(true)
      setScheduleMessage('')

      try {
        const response = await getSchedule({
          date: selectedDate,
          locationId: selectedLocationId || undefined,
          providerId: selectedProviderId || undefined,
        })

        if (response.status !== 200 || !Array.isArray(response.data)) {
          setScheduleRows([])
          setScheduleMessage(response?.data?.message || 'Unable to load the clinical schedule.')
          return
        }

        setScheduleRows(response.data)

        if (response.data.length === 0) {
          setScheduleMessage('No appointments scheduled for this filter.')
        }
      } catch (error) {
        setScheduleRows([])
        setScheduleMessage(error.message || 'Unable to load the clinical schedule.')
      } finally {
        setLoadingSchedule(false)
      }
    }

    loadClinicalSchedule()
  }, [selectedDate, selectedLocationId, selectedProviderId])

  useEffect(() => {
    if (!routePatientId) {
      return
    }

    const chartPatientId = parseId(chart?.patient?.id)
    const currentAppointmentId = parseId(selectedAppointmentId)

    if (chartPatientId === routePatientId && currentAppointmentId === routeAppointmentId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadChart(routePatientId, routeAppointmentId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [chart?.patient?.id, loadChart, routeAppointmentId, routePatientId, selectedAppointmentId])

  function handleSelectAppointment(row) {
    if (!row?.patientId) {
      return
    }

    void loadChart(row.patientId, row.id)
  }

  function handleOpenPatient(patientRecord) {
    if (!patientRecord?.id) {
      return
    }

    void loadChart(patientRecord.id, null)
  }

  const insuranceRows = [
    ['Insurance', selectedInsurance?.carrierName],
    ['Pharmacy', primaryPharmacy?.displayName || primaryPharmacy?.name],
    ['Last Visit', formatDate(patient?.lastVisitDate)],
    ['Next Visit', formatDateTime(patient?.nextAppointmentStart)],
    ['Copay', formatCurrency(selectedInsurance?.copay)],
  ]

  const addressRows = [
    ['Address', addressText(contact)],
    ['Cell', contact?.mobilePhone],
    ['Home', contact?.homePhone],
    ['Email', contact?.email],
  ]

  const reasonRows = [
    ['Appointment', selectedRow?.appointmentTypeName || chart?.appointment?.appointmentTypeName],
    ['Reason', chart?.appointment?.reason || chart?.currentVisit?.chiefComplaint || selectedRow?.reason],
    ['Provider', chart?.appointment?.providerName || chart?.currentVisit?.providerName],
    ['Room', chart?.appointment?.roomName || selectedRow?.roomName],
  ]

  const alertRows = [
    ['Alert', patient?.alert],
    ['Status', humanize(patient?.status)],
    ['Billing', humanize(patient?.billingStatus)],
    ['Stage', humanize(patient?.stage)],
  ]

  return (
    <MainLayout>
      {isSearchModalOpen ? (
        <ClinicalPatientSearchModal
          onClose={() => setIsSearchModalOpen(false)}
          onSelectPatient={handleOpenPatient}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 gap-4 max-[1180px]:flex-col">
        <aside className="grid w-[360px] shrink-0 content-start gap-4 max-[1180px]:w-full">
          <section className={ui.panel}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-extrabold text-mp-strong">Clinical</h2>
              <button className={ui.secondaryButton} type="button" onClick={() => setIsSearchModalOpen(true)}>
                Find Patient
              </button>
            </div>

            <div className="grid gap-3">
              <label className={ui.label}>
                <span>Office</span>
                <select className={ui.input} value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}>
                  <option value="">All offices</option>
                  {options.locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </label>

              <label className={ui.label}>
                <span>Provider</span>
                <select className={ui.input} value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                  <option value="">All providers</option>
                  {options.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </label>

              <label className={ui.label}>
                <span>Date</span>
                <input className={ui.input} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </label>

              <button className={ui.secondaryButton} type="button" onClick={() => setSelectedDate(inputDate())}>
                Today
              </button>
            </div>
          </section>

          <section className={cn(ui.panel, 'min-h-[640px]')}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-extrabold text-mp-strong">Schedule</h3>
                <div className="text-xs text-[#64748b]">{formatDate(selectedDate)}</div>
              </div>
              <div className="text-sm font-bold text-[#64748b]">{loadingSchedule ? 'Loading' : scheduleRows.length}</div>
            </div>

            {scheduleMessage ? <div className={ui.warning}>{scheduleMessage}</div> : null}

            <div className="overflow-hidden rounded-lg border border-mp-line bg-white">
              <div className="grid grid-cols-[62px_44px_72px_22px_minmax(0,1fr)] gap-0 border-b border-mp-line bg-[#f8fafc] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
                <div>Time</div>
                <div>Rm</div>
                <div>Type</div>
                <div />
                <div>Name</div>
              </div>

              <div className="max-h-[560px] overflow-auto">
                {loadingSchedule ? (
                  <div className={ui.empty}>Loading schedule...</div>
                ) : scheduleRows.length ? (
                  scheduleRows.map((row) => {
                    const glyph = appointmentGlyph(row)
                    const isSelected = String(row.id) === String(selectedAppointmentId)

                    return (
                      <button
                        type="button"
                        key={row.id}
                        className={cn(
                          'grid w-full grid-cols-[62px_44px_72px_22px_minmax(0,1fr)] items-start gap-0 border-t border-[#eef2f7] px-3 py-3 text-left text-sm first:border-t-0 hover:bg-[#f8fbff]',
                          isSelected ? 'bg-[#eef5ff]' : 'bg-white',
                        )}
                        onClick={() => handleSelectAppointment(row)}
                      >
                        <div className="font-bold text-mp-strong">{formatTime(row.scheduledStart)}</div>
                        <div className="text-[#475569]">{row.roomName || '-'}</div>
                        <div className="truncate text-[#475569]">{row.appointmentTypeName || '-'}</div>
                        <div className={cn('pt-[1px] text-center text-base leading-none', glyph.tone)}>{glyph.glyph}</div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-mp-strong">{row.patientName || 'Unassigned patient'}</div>
                          <div className="truncate text-xs text-[#64748b]">{row.reason || row.providerName || humanize(row.status)}</div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className={ui.empty}>No appointments scheduled.</div>
                )}
              </div>
            </div>
          </section>
        </aside>

        <section className="grid min-w-0 content-start gap-4">
          {!chart && !loadingChart ? (
            <section className={cn(ui.panel, 'min-h-[400px] place-content-center')}>
              <EmptyState message={chartMessage || 'Select a patient from the clinical schedule or search.'} />
            </section>
          ) : null}

          {loadingChart ? (
            <section className={cn(ui.panel, 'min-h-[220px] place-content-center')}>
              <EmptyState message="Loading clinical chart..." />
            </section>
          ) : null}

          {chart ? (
            <>
              <section className={ui.panel}>
                <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)]">
                  <div className="flex items-start justify-center md:justify-start">
                    <div
                      className="h-28 w-28 rounded-lg border border-mp-line bg-center bg-cover bg-no-repeat"
                      aria-label="Patient"
                      style={{ backgroundImage: `url(${avatar})` }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h1 className="m-0 text-[28px] leading-tight font-extrabold text-mp-strong">{clinicalDisplayName(patient)}</h1>
                        <div className="mt-2 grid gap-1 text-[13px] text-[#64748b]">
                          <div>Acct: <b>{patient?.id}</b> <span className="text-[#b0b7c3]">-</span> Sex: <b>{humanize(patient?.sexAtBirth)}</b></div>
                          <div>DOB: <b>{formatDate(patient?.dateOfBirth)}</b> <span className="text-[#b0b7c3]">-</span> Age: <b>{ageText(patient?.dateOfBirth)}</b></div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => navigate(`/patient-activity?patientId=${patient.id}`)}
                        >
                          Patient Activity
                        </button>
                        <button className={ui.secondaryButton} type="button" onClick={() => setIsSearchModalOpen(true)}>
                          Switch Patient
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryBlock title="Insurance & Pharmacy" rows={insuranceRows} accent="blue" />
                      <SummaryBlock title="Address & Contact" rows={addressRows} accent="green" />
                      <SummaryBlock title="Reason For Visit" rows={reasonRows} accent="amber" />
                      <SummaryBlock title="Medical Alerts" rows={alertRows} accent="red" />
                    </div>
                  </div>
                </div>
              </section>

              <section className={ui.panel}>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Clinical sections">
                  {mainTabs.map((tab) => (
                    <button
                      className={cardTitleClasses(activeTab === tab)}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </section>

              {activeTab === 'Overview' ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  <Card
                    title="Problem List"
                    action={chart.encounterDiagnoses?.length ? <StatusPill value="active" /> : null}
                    className="xl:col-span-1"
                  >
                    {chart.problems?.length ? (
                      <div className="grid gap-2.5">
                        {chart.problems.map((problem) => {
                          const isSelected = selectedProblemKeys.has(`problem-${problem.id}`)
                            || (problem.diagnosisCode && selectedProblemKeys.has(`code-${String(problem.diagnosisCode).trim().toUpperCase()}`))

                          return (
                            <div className="rounded-lg border border-[#e6edf5] p-3" key={problem.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-bold text-mp-strong">
                                    {[problem.diagnosisCode, problem.description].filter(Boolean).join(' - ')}
                                  </div>
                                  <div className="mt-1 text-xs text-[#64748b]">
                                    {[formatDate(problem.onsetDate), formatDate(problem.resolvedDate), problem.note].filter(Boolean).join(' | ')}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {isSelected ? <span className="inline-flex min-h-[22px] items-center rounded-full bg-[#e9f5ff] px-2 py-[3px] text-[11px] font-extrabold uppercase text-[#2563eb]">Selected</span> : null}
                                  <StatusPill value={problem.status} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <EmptyState message="No problems on file." />
                    )}
                  </Card>

                  <Card
                    title="Medications"
                    action={(
                      <div className="flex gap-1 rounded-full border border-[#d7e1ea] p-1">
                        {medicationFilters.map((filter) => (
                          <button
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase transition',
                              medicationFilter === filter ? 'bg-[#e9f5ff] text-[#2563eb]' : 'text-[#64748b]',
                            )}
                            type="button"
                            key={filter}
                            onClick={() => setMedicationFilter(filter)}
                          >
                            {filter === 'all' ? 'All' : humanize(filter)}
                          </button>
                        ))}
                      </div>
                    )}
                    className="xl:col-span-1"
                  >
                    {filteredMedications.length ? (
                      <div className="overflow-hidden rounded-lg border border-mp-line bg-white">
                        <div className="grid grid-cols-[minmax(0,1.2fr)_100px_minmax(0,1fr)_100px] gap-0 border-b border-mp-line bg-[#f8fafc] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b] max-[880px]:hidden">
                          <div>Medication</div>
                          <div>Strength</div>
                          <div>Sig</div>
                          <div>Status</div>
                        </div>

                        <div className="grid">
                          {filteredMedications.map((medication) => (
                            <div className="grid grid-cols-[minmax(0,1.2fr)_100px_minmax(0,1fr)_100px] gap-0 border-t border-[#eef2f7] px-3 py-3 first:border-t-0 max-[880px]:grid-cols-1 max-[880px]:gap-1" key={medication.id}>
                              <div className="min-w-0 font-bold text-mp-strong [overflow-wrap:anywhere]">{medication.medicationName}</div>
                              <div className="text-[#475569]">{medication.strength || '-'}</div>
                              <div className="text-[#475569]">{[medication.dose, medication.route, medication.frequency].filter(Boolean).join(' | ') || medication.instructions || '-'}</div>
                              <div className="flex justify-start max-[880px]:pt-1"><StatusPill value={medication.status} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <EmptyState message="No medications in this view." />
                    )}
                  </Card>

                  <Card title="Allergies & Reactions" className="xl:col-span-1">
                    {chart.allergies?.length ? (
                      <div className="overflow-hidden rounded-lg border border-mp-line bg-white">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px] gap-0 border-b border-mp-line bg-[#f8fafc] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b] max-[760px]:hidden">
                          <div>Medication</div>
                          <div>Reaction</div>
                          <div>Status</div>
                        </div>

                        <div className="grid">
                          {chart.allergies.map((allergy) => (
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px] gap-0 border-t border-[#eef2f7] px-3 py-3 first:border-t-0 max-[760px]:grid-cols-1 max-[760px]:gap-1" key={allergy.id}>
                              <div className="font-bold text-mp-strong [overflow-wrap:anywhere]">{allergy.allergen}</div>
                              <div className="text-[#475569]">{[allergy.reaction, allergy.severity].filter(Boolean).join(' | ') || '-'}</div>
                              <div className="flex justify-start max-[760px]:pt-1"><StatusPill value={allergy.status} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <EmptyState message="No allergies on file." />
                    )}
                  </Card>
                </div>
              ) : null}

              {activeTab === "Today's Note" ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <Card title="Encounter Diagnoses">
                    {chart.encounterDiagnoses?.length ? (
                      <div className="grid gap-2.5">
                        {chart.encounterDiagnoses.map((diagnosis) => (
                          <div className="rounded-lg border border-[#e6edf5] p-3" key={diagnosis.id}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-mp-strong">
                                  {[diagnosis.diagnosisCode, diagnosis.description].filter(Boolean).join(' - ')}
                                </div>
                                <div className="mt-1 text-xs text-[#64748b]">#{diagnosis.sequence}</div>
                              </div>
                              <span className="inline-flex min-h-[22px] items-center rounded-full bg-[#eef5ff] px-2 py-[3px] text-[11px] font-extrabold uppercase text-[#2563eb]">
                                Visit Dx
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message="No encounter diagnoses linked to this visit." />
                    )}
                  </Card>

                  <Card title="Clinical Notes">
                    {chart.clinicalNotes?.length || chart.patientNotes?.length ? (
                      <div className="grid gap-3">
                        {(chart.clinicalNotes || []).map((note) => (
                          <div className="rounded-lg border border-[#e6edf5] p-3" key={`clinical-${note.id}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-mp-strong">{note.title || humanize(note.noteType)}</div>
                                <div className="mt-1 text-sm text-[#475569] whitespace-pre-wrap">{note.body}</div>
                                <div className="mt-2 text-xs text-[#64748b]">{formatDateTime(note.createdAt)}</div>
                              </div>
                              <StatusPill value={note.status} />
                            </div>
                          </div>
                        ))}

                        {(chart.patientNotes || []).slice(0, 3).map((note) => (
                          <div className="rounded-lg border border-dashed border-[#d7e1ea] p-3" key={`patient-${note.id}`}>
                            <div className="font-bold text-mp-strong">{humanize(note.noteType || 'general')}</div>
                            <div className="mt-1 text-sm text-[#475569] whitespace-pre-wrap">{note.body}</div>
                            <div className="mt-2 text-xs text-[#64748b]">{formatDateTime(note.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message="No encounter notes available." />
                    )}
                  </Card>
                </div>
              ) : null}

              {activeTab === 'History' ? (
                <div className="grid gap-4">
                  <section className={ui.panel}>
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="History sections">
                      {historyTabs.map((tab) => (
                        <button
                          className={cardTitleClasses(activeHistoryTab === tab)}
                          type="button"
                          role="tab"
                          aria-selected={activeHistoryTab === tab}
                          key={tab}
                          onClick={() => setActiveHistoryTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </section>

                  {activeHistoryTab === 'Past Medical Hx' ? (
                    <Card title="Past Medical History">
                      {chart.problems?.length ? (
                        <div className="grid gap-2.5">
                          {chart.problems.map((problem) => (
                            <div className="rounded-lg border border-[#e6edf5] p-3" key={problem.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-bold text-mp-strong">{[problem.diagnosisCode, problem.description].filter(Boolean).join(' - ')}</div>
                                  <div className="mt-1 text-xs text-[#64748b]">
                                    {[
                                      problem.onsetDate ? `Onset ${formatDate(problem.onsetDate)}` : null,
                                      problem.resolvedDate ? `Resolved ${formatDate(problem.resolvedDate)}` : null,
                                      problem.note,
                                    ].filter(Boolean).join(' | ')}
                                  </div>
                                </div>
                                <StatusPill value={problem.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState message="No past medical history on file." />
                      )}
                    </Card>
                  ) : null}

                  {activeHistoryTab === 'Encounters' ? (
                    <Card title="Encounters">
                      {chart.encounters?.length ? (
                        <div className="grid gap-2.5">
                          {chart.encounters.map((visit) => (
                            <div className="rounded-lg border border-[#e6edf5] p-3" key={visit.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-bold text-mp-strong">{formatDate(visit.visitDate)} {visit.visitType ? `- ${visit.visitType}` : ''}</div>
                                  <div className="mt-1 text-sm text-[#475569]">
                                    {[visit.providerName, visit.chiefComplaint, vitalsText(visit)].filter(Boolean).join(' | ') || 'Visit summary unavailable'}
                                  </div>
                                  {visit.locationName ? <div className="mt-1 text-xs text-[#64748b]">{visit.locationName}</div> : null}
                                </div>
                                <StatusPill value={visit.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState message="No encounters on file." />
                      )}
                    </Card>
                  ) : null}

                  {activeHistoryTab === 'Family Hx' ? (
                    <Card title="Family History">
                      <EmptyState message="No family history has been migrated yet." />
                    </Card>
                  ) : null}

                  {activeHistoryTab === 'Social Hx' ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                      <Card title="Social Snapshot">
                        <div className="grid gap-2.5">
                          {[
                            ['Marital Status', humanize(patient?.maritalStatus)],
                            ['Employment', humanize(patient?.employmentStatus)],
                            ['Communication', humanize(contact?.communicationPreference)],
                            ['Language', patient?.preferredLanguage],
                          ].map(([label, value]) => (
                            <div className="grid gap-1" key={label}>
                              <div className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#7a8798]">{label}</div>
                              <div className="text-sm font-semibold text-mp-strong">{value || '-'}</div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card title="Smoking History">
                        {chart.encounters?.some((visit) => visit.smokingStatus) ? (
                          <div className="grid gap-2.5">
                            {chart.encounters
                              .filter((visit) => visit.smokingStatus)
                              .map((visit) => (
                                <div className="rounded-lg border border-[#e6edf5] p-3" key={`smoking-${visit.id}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-bold text-mp-strong">{humanize(visit.smokingStatus)}</div>
                                      <div className="mt-1 text-xs text-[#64748b]">{formatDate(visit.visitDate)}</div>
                                    </div>
                                    <StatusPill value={visit.status} />
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <EmptyState message="No social history snapshots on file." />
                        )}
                      </Card>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'Orders' ? (
                <Card
                  title="Orders"
                  action={(
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#cbd5e1]"
                        checked={ordersCurrentVisitOnly}
                        onChange={(event) => setOrdersCurrentVisitOnly(event.target.checked)}
                      />
                      This Visit Only
                    </label>
                  )}
                >
                  {filteredOrders.length ? (
                    <div className="overflow-hidden rounded-lg border border-mp-line bg-white">
                      <div className="grid grid-cols-[112px_104px_minmax(0,1.1fr)_minmax(0,0.8fr)_110px] gap-0 border-b border-mp-line bg-[#f8fafc] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#64748b] max-[920px]:hidden">
                        <div>Date</div>
                        <div>Type</div>
                        <div>Description</div>
                        <div>Ordered By</div>
                        <div>Status</div>
                      </div>

                      <div className="grid">
                        {filteredOrders.map((order) => (
                          <div className="grid grid-cols-[112px_104px_minmax(0,1.1fr)_minmax(0,0.8fr)_110px] gap-0 border-t border-[#eef2f7] px-3 py-3 first:border-t-0 max-[920px]:grid-cols-1 max-[920px]:gap-1" key={order.id}>
                            <div className="text-[#475569]">{formatDate(order.orderedAt)}</div>
                            <div className="text-[#475569]">{humanize(order.orderType)}</div>
                            <div className="font-bold text-mp-strong [overflow-wrap:anywhere]">{[order.code, order.description].filter(Boolean).join(' - ')}</div>
                            <div className="text-[#475569]">{order.orderedByProviderName || '-'}</div>
                            <div className="flex justify-start max-[920px]:pt-1"><StatusPill value={order.status} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No orders in this view." />
                  )}
                </Card>
              ) : null}

              {activeTab === 'Flowsheets' ? (
                <Card title="Flowsheets">
                  {chart.encounterForms?.length ? (
                    <div className="grid gap-2.5">
                      {chart.encounterForms.map((form) => (
                        <div className="rounded-lg border border-[#e6edf5] p-3" key={form.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-bold text-mp-strong">{form.formCode}</div>
                              <div className="mt-1 text-xs text-[#64748b]">{[form.section, formatDateTime(form.updatedAt)].filter(Boolean).join(' | ')}</div>
                              <div className="mt-2 text-sm text-[#475569] [overflow-wrap:anywhere]">{form.dataPreview || 'No preview available.'}</div>
                            </div>
                            <StatusPill value={form.completed ? 'completed' : 'draft'} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No flowsheet payloads imported for this visit." />
                  )}
                </Card>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </MainLayout>
  )
}
