import MainLayout from '../components/MainLayout'
import { getStoredSession } from '../services/session'

const scheduleRows = [
  {
    time: '8:30am',
    arrival: 'ok',
    patient: 'Erica Caffrey',
    reason: 'Follow up diabetes, medication review',
    visit: 'ok',
    billing: 'warn',
  },
  {
    time: '9:00am',
    arrival: 'warn',
    patient: 'Daniel Steward',
    reason: 'Annual wellness visit',
    visit: 'ok',
    billing: 'ok',
  },
  {
    time: '9:45am',
    arrival: 'ok',
    patient: 'Camila Ortega',
    reason: 'Lab results and blood pressure check',
    visit: 'warn',
    billing: 'ok',
  },
  {
    time: '10:30am',
    arrival: 'err',
    patient: 'Noah Price',
    reason: 'New patient consultation',
    visit: 'warn',
    billing: 'warn',
  },
]

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
  const session = getStoredSession()
  const now = new Date()

  return (
    <MainLayout>
      <div className="w-full flex-1 rounded-lg border-2 border-[var(--mp-line-strong)] p-4 max-[720px]:p-3">
        <section id="DASHBOARD_ROOT" className="px-4 pb-3">
          <div className="mb-2 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-start">
            <div className="mr-auto flex items-baseline gap-2.5">
              <h2 className="m-0 text-xl font-bold text-[var(--mp-strong)]">Dashboard</h2>
              <div className="font-semibold text-[var(--mp-muted)]">Welcome, {session?.username || 'user'}</div>
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
              <div className="leading-[1.1]">
                <div className="font-bold text-slate-900">
                  {now.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
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
                  {now.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
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
                <div className="text-[32px] font-extrabold leading-none">0</div>
                <div className="mt-1 text-[13px]">Today's Appointments</div>
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
                <div className="text-[32px] font-extrabold leading-none">0</div>
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
                <div className="text-[32px] font-extrabold leading-none">0</div>
                <div className="mt-1 text-[13px]">Inbox Documents</div>
              </div>
            </div>
          </div>

          <div id="dash-sched" className="rounded-lg border border-[var(--mp-line)] bg-white p-3.5">
            <div className="mt-2.5 mb-1.5 font-semibold text-[var(--mp-strong)]">Today's Schedule</div>

            <div className="overflow-hidden rounded-lg border border-[var(--mp-line)] bg-white max-[720px]:overflow-x-auto">
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
                {scheduleRows.map((row, index) => (
                  <div
                    className={`grid cursor-pointer grid-cols-[80px_28px_40px_minmax(150px,1.2fr)_minmax(220px,2fr)_28px_28px] items-center gap-x-3 border-t border-[#eef2f7] p-2 hover:bg-[#eef5ff] max-[720px]:min-w-[760px] ${
                      index === 0 ? 'bg-[#ffe6ef]' : ''
                    }`}
                    key={`${row.time}-${row.patient}`}
                  >
                    <div className="min-w-0 py-1.5 text-center">{row.time}</div>
                    <div className="flex min-w-0 justify-center py-1.5 text-center">
                      <StatusDot status={row.arrival} />
                    </div>
                    <div className="min-w-0 py-1.5 text-center">
                      <span className="mx-auto block h-8 w-8 rounded-full bg-gray-100 object-cover" />
                    </div>
                    <div className="min-w-0 py-1.5 font-medium">{row.patient}</div>
                    <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap py-1.5 text-xs text-gray-600">{row.reason}</div>
                    <div className="flex min-w-0 justify-center py-1.5 text-center">
                      <StatusDot status={row.visit} />
                    </div>
                    <div className="flex min-w-0 justify-center py-1.5 text-center">
                      <StatusDot status={row.billing} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
