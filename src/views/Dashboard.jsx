import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { ui } from '../components/ui'
import { getSchedule, getScheduleOptions } from '../services/schedule'
import { getStoredSession } from '../services/session'

const DASHBOARD_OFFICE_KEY = 'medpointe.dashboard.officeId'

function inputDate(value = new Date()) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function displayDate(value) {
  if (!value) {
    return ''
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
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

function statusTone(status) {
  if (['checked_in', 'triage', 'with_provider', 'ready_checkout', 'checked_out', 'completed', 'paid'].includes(status)) {
    return 'ok'
  }

  if (['cancelled', 'no_show', 'denied', 'voided'].includes(status)) {
    return 'err'
  }

  return 'warn'
}

function isPendingNote(row) {
  return !row?.signedAt
    && Boolean(row?.encounterClosedAt || ['ready_checkout', 'checked_out', 'completed'].includes(row?.status))
}

function isBillingOpen(row) {
  return Boolean(row?.billingStatus) && !['paid', 'voided'].includes(String(row.billingStatus).toLowerCase())
}

function StatusDot({ status }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full align-middle ${
        status === 'ok' ? 'bg-emerald-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'
      }`}
      aria-hidden="true"
    />
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const [clockNow, setClockNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => inputDate())
  const [officeOptions, setOfficeOptions] = useState([])
  const [selectedOfficeId, setSelectedOfficeId] = useState('')
  const [scheduleRows, setScheduleRows] = useState([])
  const [scheduleSearch, setScheduleSearch] = useState('')

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockNow(new Date())
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    async function loadOfficeOptions() {
      try {
        const response = await getScheduleOptions()

        if (response.status === 200 && response.data) {
          const locations = Array.isArray(response.data.locations) ? response.data.locations : []
          const storedOfficeId = localStorage.getItem(DASHBOARD_OFFICE_KEY) || ''
          const preferredOfficeId = locations.find((location) => String(location.id) === storedOfficeId)?.id
            ?? locations[0]?.id
            ?? ''

          setOfficeOptions(locations)
          setSelectedOfficeId(preferredOfficeId ? String(preferredOfficeId) : '')
        }
      } catch {
        setOfficeOptions([])
        setSelectedOfficeId('')
      }
    }

    loadOfficeOptions()
  }, [])

  useEffect(() => {
    if (selectedOfficeId) {
      localStorage.setItem(DASHBOARD_OFFICE_KEY, selectedOfficeId)
    }
  }, [selectedOfficeId])

  useEffect(() => {
    async function loadTodaySchedule() {
      try {
        const response = await getSchedule({
          date: selectedDate,
          locationId: selectedOfficeId || undefined,
        })

        if (response.status === 200 && Array.isArray(response.data)) {
          setScheduleRows(response.data)
        } else {
          setScheduleRows([])
        }
      } catch {
        setScheduleRows([])
      }
    }

    loadTodaySchedule()
  }, [selectedDate, selectedOfficeId])

  const selectedOffice = officeOptions.find((office) => String(office.id) === String(selectedOfficeId))
  const filteredScheduleRows = useMemo(() => {
    const term = scheduleSearch.trim().toLowerCase()

    if (term.length < 3) {
      return scheduleRows
    }

    return scheduleRows.filter((row) => String(row.patientName || '').toLowerCase().includes(term))
  }, [scheduleRows, scheduleSearch])
  const metrics = useMemo(() => ({
    appointments: scheduleRows.length,
    notesPending: scheduleRows.filter(isPendingNote).length,
    billingOpen: scheduleRows.filter(isBillingOpen).length,
  }), [scheduleRows])
  const scheduleSearchIsActive = scheduleSearch.trim().length >= 3
  const visibleScheduleCount = filteredScheduleRows.length
  const scheduleEmptyMessage = scheduleSearchIsActive
    ? 'No matching patients in the selected office schedule.'
    : 'No appointments scheduled.'

  return (
    <MainLayout>
      <div className="w-full flex-1 rounded-lg border-2 border-mp-line-strong p-4 max-[720px]:p-3">
        <section id="DASHBOARD_ROOT" className="px-4 pb-3">
          <div className="mb-2 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-start">
            <div className="mr-auto flex items-baseline gap-2.5">
              <h2 className="m-0 text-xl font-bold text-mp-strong">Dashboard</h2>
              <div className="font-semibold text-mp-muted">Welcome, {session?.username || 'user'}</div>
            </div>

            <div className="flex items-center gap-3 max-[720px]:w-full max-[720px]:flex-col max-[720px]:items-stretch">
              <div className="flex min-w-[230px] items-center gap-2.5 rounded-lg border border-[#e6eef8] bg-white px-3 py-2.5 shadow-[0_2px_10px_rgba(16,24,40,0.04)] max-[720px]:w-full max-[720px]:min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef5ff] text-[#2563eb]">
                  <svg
                    className="h-5 w-5 fill-none stroke-current"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16" />
                    <path d="M7 3h10v18H7z" />
                    <path d="M10 11h4" />
                    <path d="M10 15h4" />
                  </svg>
                </div>
                <label className="grid min-w-0 flex-1 gap-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-slate-500">Office</span>
                  <select
                    className="min-h-8 min-w-0 rounded-md border border-[#d9e2ea] bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 outline-none"
                    value={selectedOfficeId}
                    onChange={(event) => setSelectedOfficeId(event.target.value)}
                  >
                    {officeOptions.map((office) => (
                      <option key={office.id} value={office.id}>{office.name}</option>
                    ))}
                    {!officeOptions.length ? <option value="">No offices</option> : null}
                  </select>
                </label>
              </div>

              <div className="flex min-w-[250px] items-center gap-2.5 rounded-lg border border-[#e6eef8] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(16,24,40,0.04)] max-[720px]:w-full max-[720px]:min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#2563eb]">
                  <svg
                    className="h-5 w-5 fill-none stroke-current"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                  </svg>
                </div>
                <label className="grid min-w-0 flex-1 gap-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-slate-500">Schedule Date</span>
                  <input
                    className="min-h-8 min-w-0 rounded-md border border-[#d9e2ea] bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 outline-none"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                  <span className="truncate text-xs text-slate-600">{displayDate(selectedDate)}</span>
                </label>
                <div className="leading-[1.1] text-right">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-slate-500">Now</div>
                  <div className="mt-1 flex items-center justify-end gap-1.5 text-sm font-bold text-slate-900">
                    <svg
                      className="h-3.5 w-3.5 fill-none stroke-slate-500"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {clockNow.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-[2vh] mb-[4vh] grid w-full grid-cols-3 gap-4 max-[1200px]:grid-cols-2 max-[720px]:grid-cols-1">
            <div className="flex h-24 w-full min-w-0 items-center rounded-full bg-[#4190f5] px-5 py-3.5 text-white shadow-[0_4px_14px_rgba(16,24,40,0.08)]">
              <div className="mr-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white">
                <svg className="h-[30px] w-[30px] fill-none stroke-[#4190f5]" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="8" y1="3" x2="8" y2="7" />
                  <line x1="16" y1="3" x2="16" y2="7" />
                </svg>
              </div>
              <div>
                <div className="text-[32px] font-extrabold leading-none">{metrics.appointments}</div>
                <div className="mt-1 text-[13px]">Appointments</div>
              </div>
            </div>

            <div className="flex h-24 w-full min-w-0 items-center rounded-full bg-[#1e68c5] px-5 py-3.5 text-white shadow-[0_4px_14px_rgba(16,24,40,0.08)]">
              <div className="mr-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white">
                <svg className="h-[30px] w-[30px] fill-none stroke-[#1e68c5]" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 17h12l-1-2v-5a5 5 0 0 0-10 0v5l-1 2z" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
              </div>
              <div>
                <div className="text-[32px] font-extrabold leading-none">{metrics.notesPending}</div>
                <div className="mt-1 text-[13px]">Notes Pending</div>
              </div>
            </div>

            <div className="flex h-24 w-full min-w-0 items-center rounded-full bg-[#184474] px-5 py-3.5 text-white shadow-[0_4px_14px_rgba(16,24,40,0.08)]">
              <div className="mr-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white">
                <svg className="h-[30px] w-[30px] fill-none stroke-[#184474]" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <div className="text-[32px] font-extrabold leading-none">{metrics.billingOpen}</div>
                <div className="mt-1 text-[13px]">Billing Open</div>
              </div>
            </div>
          </div>

          <div id="dash-sched" className="rounded-lg border border-mp-line bg-white p-3.5">
            <div className="mt-2.5 mb-2.5 grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,260px)_auto] lg:items-center">
              <div>
                <div className="font-semibold text-mp-strong">Schedule</div>
                <div className="text-xs font-semibold text-mp-muted">
                  {visibleScheduleCount} visible {visibleScheduleCount === 1 ? 'appointment' : 'appointments'}
                </div>
              </div>
              <label className="grid gap-1">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-slate-500">Search Patients</span>
                <input
                  className="min-h-9 rounded-md border border-[#d9e2ea] bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none"
                  type="text"
                  value={scheduleSearch}
                  onChange={(event) => setScheduleSearch(event.target.value)}
                  placeholder="Min 3 letters"
                />
              </label>
              <div className="text-xs font-semibold text-mp-muted lg:text-right">
                {selectedOffice?.name || 'Office'}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-mp-line bg-white max-[720px]:overflow-x-auto">
              <div className="grid grid-cols-[80px_28px_40px_minmax(150px,1.2fr)_minmax(220px,2fr)_28px_28px] items-center gap-x-3 bg-gray-100 py-1.5 pr-[31px] pl-2 text-xs font-semibold text-slate-900 max-[720px]:min-w-[760px]">
                <div className="min-w-0 py-1.5 text-center">Time</div>
                <div className="flex min-w-0 justify-center py-1.5 text-center">Arrival</div>
                <div className="min-w-0 py-1.5 text-center" />
                <div className="min-w-0 py-1.5 font-medium">Patient</div>
                <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap py-1.5 text-xs text-gray-600">Reason</div>
                <div className="flex min-w-0 justify-center py-1.5 text-center">Visit</div>
                <div className="flex min-w-0 justify-center py-1.5 text-center">Billing</div>
              </div>

              <div className="max-h-[420px] overflow-auto">
                {filteredScheduleRows.map((row, index) => (
                  <button
                    type="button"
                    className={`grid w-full cursor-pointer grid-cols-[80px_28px_40px_minmax(150px,1.2fr)_minmax(220px,2fr)_28px_28px] items-center gap-x-3 border-t border-[#eef2f7] p-2 text-left hover:bg-[#eef5ff] disabled:cursor-default disabled:hover:bg-white max-[720px]:min-w-[760px] ${
                      index === 0 ? 'bg-[#ffe6ef]' : 'bg-white'
                    }`}
                    disabled={!row.patientId}
                    key={row.id}
                    onClick={() => navigate(`/patient-activity?patientId=${row.patientId}`)}
                  >
                    <div className="min-w-0 py-1.5 text-center">{formatTime(row.scheduledStart)}</div>
                    <div className="flex min-w-0 justify-center py-1.5 text-center">
                      <StatusDot status={statusTone(row.status)} />
                    </div>
                    <div className="min-w-0 py-1.5 text-center">
                      <span className="mx-auto block h-8 w-8 rounded-full bg-gray-100 object-cover" />
                    </div>
                    <div className="min-w-0 py-1.5 font-medium">{row.patientName || 'Unassigned'}</div>
                    <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap py-1.5 text-xs text-gray-600">{row.reason || row.appointmentTypeName || '-'}</div>
                    <div className="flex min-w-0 justify-center py-1.5 text-center">
                      <StatusDot status={statusTone(row.status)} />
                    </div>
                    <div className="flex min-w-0 justify-center py-1.5 text-center">
                      <StatusDot status={row.billingStatus ? statusTone(row.billingStatus) : 'warn'} />
                    </div>
                  </button>
                ))}

                {filteredScheduleRows.length === 0 ? (
                  <div className={ui.empty}>{scheduleEmptyMessage}</div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
