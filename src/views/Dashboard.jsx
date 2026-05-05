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
  return <span className={`sg-status ${status}`} aria-hidden="true" />
}

function KpiCard({ variant, value, label, children }) {
  return (
    <div className={`kpi ${variant}`}>
      <div className="kpi-left">{children}</div>
      <div>
        <div className="kpi-num">{value}</div>
        <div className="kpi-text">{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const session = getStoredSession()
  const now = new Date()

  return (
    <MainLayout>
      <div className="medpointe-daeshboard">
        <section id="DASHBOARD_ROOT" className="dash-root">
          <div className="dash-header">
            <div className="dash-h-left">
              <h2 className="dash-title">Dashboard</h2>
              <div className="dash-welcome">Welcome, {session?.username || 'user'}</div>
            </div>

            <div className="dash-now">
              <div className="dn-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="8" y1="3" x2="8" y2="7" />
                  <line x1="16" y1="3" x2="16" y2="7" />
                </svg>
              </div>
              <div className="dn-text">
                <div className="dn-date">
                  {now.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="dn-time">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
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

          <div className="dash-kpis">
            <KpiCard variant="kpi--apt" value="0" label="Today's Appointments">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="8" y1="3" x2="8" y2="7" />
                <line x1="16" y1="3" x2="16" y2="7" />
              </svg>
            </KpiCard>

            <KpiCard variant="kpi--notes" value="0" label="Notes Pending">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 17h12l-1-2v-5a5 5 0 0 0-10 0v5l-1 2z" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>
            </KpiCard>

            <KpiCard variant="kpi--inbox" value="0" label="Inbox Documents">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </KpiCard>
          </div>

          <div id="dash-sched" className="dash-block">
            <div className="dash-block-title">Today's Schedule</div>

            <div className="dash-table">
              <div className="dash-thead">
                <div className="c-time">Time</div>
                <div className="c-s">Arrival</div>
                <div className="c-pic" />
                <div className="c-name">Patient</div>
                <div className="c-reason">Reason</div>
                <div className="c-s">Visit</div>
                <div className="c-s">Billing</div>
              </div>

              <div className="dash-tbody">
                {scheduleRows.map((row, index) => (
                  <div
                    className={`dash-row${index === 0 ? ' active' : ''}`}
                    key={`${row.time}-${row.patient}`}
                  >
                    <div className="c-time">{row.time}</div>
                    <div className="c-s">
                      <StatusDot status={row.arrival} />
                    </div>
                    <div className="c-pic">
                      <span className="sg-avatar" />
                    </div>
                    <div className="c-name">{row.patient}</div>
                    <div className="c-reason">{row.reason}</div>
                    <div className="c-s">
                      <StatusDot status={row.visit} />
                    </div>
                    <div className="c-s">
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
