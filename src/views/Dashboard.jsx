import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { getSchedule, getScheduleOptions } from '../services/schedule'
import { getStoredSession } from '../services/session'
import { getDashboardContext } from '../services/auth'

const OFFICE_STORAGE_KEY = 'medpointe.dashboard.officeId'
const SCHEDULE_COLUMNS = 'grid-cols-[84px_72px_minmax(280px,1.25fr)_minmax(260px,1.45fr)_62px_62px]'

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function displayDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function displayTime(value) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace(' AM', 'am').replace(' PM', 'pm')
}

function displayClockTime(value) {
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] || ''}${parts.length > 1 ? parts.at(-1)[0] : ''}`.toUpperCase()
}

function arrivalGlyph(row) {
  const status = row.status
  if (status === 'scheduled' && row.confirmedAt) {
    return { character: '■', color: '#2ecc71', label: 'Confirmed' }
  }
  switch (status) {
    case 'confirmed': return { character: '■', color: '#2ecc71', label: 'Confirmed' }
    case 'checked_in':
    case 'triage': return { character: '►', color: '#d99a00', label: 'Arrived / triage' }
    case 'with_provider': return { character: '►', color: '#2ecc71', label: 'Provider stage' }
    case 'nurse_order': return { character: '►', color: '#3498db', label: 'Nurse order' }
    case 'ready_checkout': return { character: '►', color: '#e74c3c', label: 'Pending checkout' }
    case 'checked_out':
    case 'completed': return { character: '✓', color: '#9e9e9e', label: 'Checked out' }
    case 'no_show': return { character: '✖', color: '#e74c3c', label: 'No show' }
    case 'cancelled': return { character: '✖', color: '#9e9e9e', label: 'Canceled' }
    default: return null
  }
}

function visitGlyph(status) {
  switch (status) {
    case 'open': return { character: '◆', color: '#2ecc71', label: 'Open' }
    case 'pending_signature': return { character: '◆', color: '#9e9e9e', label: 'Encounter closed / pending sign' }
    case 'signed': return { character: '✓', color: '#000000', label: 'Signed' }
    default: return null
  }
}

function billingGlyph(status, stage) {
  if (stage === 'closed') return { character: '✓', color: '#000000', label: 'Complete' }
  switch (status) {
    case 'draft': return { character: '●', color: '#3498db', label: 'Unposted' }
    case 'ready_to_bill': return { character: '●', color: '#d99a00', label: 'Ready to bill' }
    case 'submitted': return { character: '●', color: '#2ecc71', label: 'Submitted' }
    case 'paid': return { character: '●', color: '#9e9e9e', label: 'Paid' }
    case 'denied': return { character: '●', color: '#e74c3c', label: 'Denied' }
    default: return null
  }
}

function StatusGlyph({ glyph }) {
  return (
    <span className="flex min-h-[30px] items-center justify-center" aria-label={glyph?.label} title={glyph?.label}>
      {glyph ? <span className="text-[28px] leading-none font-extrabold" style={{ color: glyph.color }}>{glyph.character}</span> : null}
    </span>
  )
}

function DashboardIcon({ name }) {
  const shared = {
    className: 'h-[22px] w-[22px] fill-none stroke-current stroke-[2.15] [stroke-linecap:round] [stroke-linejoin:round]',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'bell') return <svg {...shared}><path d="M7 10.2a5 5 0 0 1 10 0v3.9l1.8 2.9H5.2L7 14.1z" /><path d="M10 20h4" /></svg>
  if (name === 'people') return <svg {...shared}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.8 19a5.2 5.2 0 0 1 10.4 0M15 6.2a3 3 0 0 1 0 5.6M17 14.2a4.9 4.9 0 0 1 3.2 4.8" /></svg>
  return <svg {...shared}><rect x="4.5" y="5.5" width="15" height="14" rx="2.2" /><path d="M8 3.8v4M16 3.8v4M4.5 10h15" /></svg>
}

function KpiCard({ value, label, icon, background }) {
  return (
    <article className="flex min-h-[68px] min-w-0 items-center gap-[16px] overflow-hidden rounded-full px-[16px] py-[10px] text-white shadow-[0_9px_18px_rgba(24,68,116,0.06)]" style={{ background }}>
      <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-white" style={{ color: background }}><DashboardIcon name={icon} /></span>
      <span className="grid min-w-0 gap-[3px]">
        <strong className="text-[28px] leading-none font-extrabold tracking-tight">{value}</strong>
        <small className="truncate text-[12.5px] leading-[1.2] font-extrabold">{label}</small>
      </span>
    </article>
  )
}

function ScheduleRow({ row, onOpen }) {
  const patientName = row.patientListName || row.patientName
  return (
    <button
      type="button"
      className={`grid min-h-[54px] w-full min-w-[980px] items-center gap-2 rounded-[5px] border border-[#dee5eb] bg-white px-[18px] text-left text-sm text-[#425166] hover:border-[#4190f5] hover:shadow-[0_0_0_3px_rgba(65,144,245,0.10)] focus-visible:border-[#4190f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4190f5] ${SCHEDULE_COLUMNS}`}
      onClick={() => onOpen(row)}
      aria-label={`Open ${patientName || 'appointment'}`}
    >
      <span>{displayTime(row.scheduledStart)}</span>
      <StatusGlyph glyph={arrivalGlyph(row)} />
      <span className="flex min-w-0 items-center gap-[14px]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d9d9d9] text-xs font-extrabold text-[#184474]">{initials(patientName)}</span>
        <span className="truncate">{patientName}</span>
      </span>
      <span className="truncate">{row.reason || ''}</span>
      <StatusGlyph glyph={visitGlyph(row.clinicalNoteStatus)} />
      <StatusGlyph glyph={billingGlyph(row.billingStatus, row.billingStage)} />
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const [clockNow, setClockNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => localDate())
  const [offices, setOffices] = useState([])
  const [officesLoading, setOfficesLoading] = useState(true)
  const [officeError, setOfficeError] = useState('')
  const [providerName, setProviderName] = useState('')
  const [selectedOfficeId, setSelectedOfficeId] = useState('')
  const [appointments, setAppointments] = useState([])
  const [scheduleError, setScheduleError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadOffices() {
      try {
        const [contextResult, optionsResult] = await Promise.allSettled([
          getDashboardContext(), getScheduleOptions(),
        ])
        const context = contextResult.status === 'fulfilled' && contextResult.value.status === 200
          ? contextResult.value.data : null
        if (optionsResult.status === 'rejected') throw optionsResult.reason
        const response = optionsResult.value
        if (response.status !== 200) throw new Error('Unable to load offices')
        const locations = Array.isArray(response.data?.locations) ? response.data.locations : []
        if (cancelled) return
        const stored = localStorage.getItem(OFFICE_STORAGE_KEY)
        const preferred = locations.find((office) => String(office.id) === stored)
          || locations.find((office) => office.id === context?.defaultLocationId)
          || locations[0]
        setProviderName(context?.providerName || '')
        setOffices(locations)
        setSelectedOfficeId(preferred ? String(preferred.id) : '')
        setOfficeError(locations.length ? '' : 'No offices available.')
      } catch {
        if (!cancelled) {
          setOffices([])
          setOfficeError('Unable to load offices.')
        }
      } finally {
        if (!cancelled) setOfficesLoading(false)
      }
    }
    void loadOffices()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selectedOfficeId) localStorage.setItem(OFFICE_STORAGE_KEY, selectedOfficeId)
  }, [selectedOfficeId])

  useEffect(() => {
    if (officesLoading || officeError) return undefined
    let cancelled = false
    async function loadSchedule() {
      try {
        const response = await getSchedule({
          date: selectedDate,
          locationId: selectedOfficeId || undefined,
        })
        if (cancelled) return
        setAppointments(Array.isArray(response.data)
          ? response.data.filter((row) => row.patientId && row.status !== 'voided')
          : [])
        setScheduleError('')
      } catch {
        if (!cancelled) {
          setAppointments([])
          setScheduleError('Unable to load dashboard schedule.')
        }
      }
    }
    void loadSchedule()
    return () => { cancelled = true }
  }, [selectedDate, selectedOfficeId, officesLoading, officeError])

  const notesPending = useMemo(() => appointments.filter((row) =>
    row.clinicalNoteStatus === 'pending_signature'
    || (!row.clinicalNoteStatus && row.encounterClosedAt && !row.signedAt)
  ).length, [appointments])

  function openAppointment(row) {
    const params = new URLSearchParams({ patientId: String(row.patientId), appointmentId: String(row.id) })
    navigate(`/clinical?${params}`)
  }

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-104px)] min-w-0 flex-1 rounded-[15px] border border-[#c7d9e5] bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-[26px]">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="m-0 text-xl leading-tight font-extrabold tracking-tight text-[#111827]">
              Dashboard <span className="ml-2 text-[13px] font-extrabold tracking-normal text-[#425166]">Welcome, {providerName || session?.username || 'user'}!</span>
            </h1>
            <div className="flex flex-wrap items-center justify-end gap-[22px] max-[760px]:w-full max-[760px]:justify-start">
              <label className="inline-flex items-center gap-2 text-[11px] font-extrabold text-[#111827]">
                Office
                <select
                  className="min-h-9 max-w-[190px] rounded-md border border-[#c7d9e5] bg-white px-2 text-sm font-semibold text-[#184474]"
                  value={selectedOfficeId}
                  onChange={(event) => setSelectedOfficeId(event.target.value)}
                  disabled={officesLoading || offices.length === 0}
                  aria-label="Office"
                >
                  {offices.length === 0 ? <option value="">{officesLoading ? 'Loading offices...' : 'Offices unavailable'}</option> : null}
                  {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                </select>
              </label>
              <label className="relative grid h-[50px] min-w-[200px] cursor-pointer grid-cols-[32px_1fr_18px] items-center gap-2.5 rounded-2xl border border-[#c7d9e5] bg-white px-3.5 py-1 text-[#184474] shadow-[0_1px_2px_rgba(24,68,116,0.05)] focus-within:ring-2 focus-within:ring-[#4190f5] max-[760px]:w-full">
                <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#eef6ff] text-[#4190f5]"><DashboardIcon name="calendar" /></span>
                <span className="grid gap-px">
                  <strong className="text-base leading-tight">{displayDate(selectedDate)}</strong>
                  <small className="text-[11px] text-[#425166]">{displayClockTime(clockNow)}</small>
                </span>
                <span className="text-xs text-[#425166]" aria-hidden="true">▼</span>
                <input
                  type="date"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  value={selectedDate}
                  onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value) }}
                  aria-label="Dashboard date"
                />
              </label>
            </div>
          </header>
          {officeError ? <p className="m-0 text-sm text-red-700" role="alert">{officeError}</p> : null}

          <section className="min-w-0 rounded-[15px] border border-[#c7d9e5] bg-white px-4 pt-[22px] pb-[31px] sm:px-8" aria-labelledby="overview-title">
            <h2 id="overview-title" className="m-0 text-lg leading-8 font-extrabold tracking-tight text-[#184474]">Today&apos;s Overview</h2>
            <div className="mt-6 grid grid-cols-1 gap-3.5 min-[1280px]:grid-cols-3 min-[761px]:max-[1279px]:grid-cols-2">
              <KpiCard value={appointments.length} label="Today’s Appointments" icon="calendar" background="#4190f5" />
              <KpiCard value={notesPending} label="Notes Pending" icon="bell" background="#1e68c5" />
              <KpiCard value="—" label="Inbox Documents" icon="people" background="#184474" />
            </div>
          </section>

          <section className="min-h-[358px] min-w-0 overflow-hidden rounded-[15px] border border-[#c7d9e5] bg-white px-3.5 pt-5 pb-3" aria-labelledby="schedule-title">
            <h2 id="schedule-title" className="m-0 pb-2 text-lg leading-8 font-extrabold tracking-tight text-[#184474]">Today&apos;s Schedule</h2>
            {scheduleError ? <p className="p-4 text-sm text-red-700" role="alert">{scheduleError}</p> : null}
            <div className="w-full overflow-x-auto pb-1" role="table" aria-label="Today's Schedule">
              <div className={`grid min-h-[34px] min-w-[980px] items-center gap-2 px-[18px] text-xs font-extrabold text-[#979797] ${SCHEDULE_COLUMNS}`} role="row">
                {['Time', 'Arrival', 'Patient', 'Reason', 'Visit', 'Billing'].map((label) =>
                  <span key={label} role="columnheader">{label}</span>
                )}
              </div>
              <div className="max-h-[min(47vh,360px)] min-w-[980px] space-y-[7px] overflow-y-auto pr-1" role="rowgroup">
                {appointments.map((row) => <ScheduleRow key={row.id} row={row} onOpen={openAppointment} />)}
                {!appointments.length && !scheduleError ? <div className="rounded-md border border-[#c7d9e5] p-5 text-sm text-[#425166]">No appointments to show.</div> : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
