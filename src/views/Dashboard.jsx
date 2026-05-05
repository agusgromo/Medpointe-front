import { useNavigate } from 'react-router-dom'
import logo from '../assets/mpointe-3.svg'
import { clearSession, getStoredSession } from '../services/session'

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
  const navigate = useNavigate()
  const session = getStoredSession()
  const now = new Date()

  function handleSignOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-page-wrapper">
      <header className="header">
        <div className="flex-box flex-gap-small align-center--flex">
          <button className="menu-button--header" type="button" aria-label="Menu">
            <span className="hr-trigger-1" />
            <span className="hr-trigger-2" />
            <span className="hr-trigger-3" />
          </button>

          <div className="logo-wrap">
            <img src={logo} loading="lazy" alt="MedPointe" className="img-logo" />
          </div>

          <div className="nav-primary">
            <button
              className="sign-out"
              type="button"
              title="Sign out"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <span className="icon signout">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.59 11.0001L8.29 13.2901C8.19627 13.3831 8.12188 13.4937 8.07111 13.6155C8.02034 13.7374 7.9942 13.8681 7.9942 14.0001C7.9942 14.1321 8.02034 14.2628 8.07111 14.3847C8.12188 14.5065 8.19627 14.6171 8.29 14.7101C8.38296 14.8038 8.49356 14.8782 8.61542 14.929C8.73728 14.9798 8.86799 15.0059 9 15.0059C9.13201 15.0059 9.26272 14.9798 9.38458 14.929C9.50644 14.8782 9.61704 14.8038 9.71 14.7101L13.71 10.7101C13.801 10.615 13.8724 10.5029 13.92 10.3801C14.02 10.1366 14.02 9.86356 13.92 9.6201C13.8724 9.49735 13.801 9.3852 13.71 9.2901L9.71 5.2901C9.61676 5.19686 9.50607 5.1229 9.38425 5.07244C9.26243 5.02198 9.13186 4.99601 9 4.99601C8.86814 4.99601 8.73757 5.02198 8.61575 5.07244C8.49393 5.1229 8.38324 5.19686 8.29 5.2901C8.1017 5.4784 7.99591 5.7338 7.99591 6.0001C7.99591 6.2664 8.1017 6.5218 8.29 6.7101L10.59 9.0001H1C0.734784 9.0001 0.48043 9.10546 0.292893 9.29299C0.105357 9.48053 0 9.73488 0 10.0001C0 10.2653 0.105357 10.5197 0.292893 10.7072C0.48043 10.8947 0.734784 11.0001 1 11.0001H10.59ZM10 0.0001C8.13109 -0.00824 6.29724 0.507313 4.70647 1.48829C3.11569 2.46927 1.83165 3.87641 1 5.5501C0.880653 5.78879 0.861015 6.06512 0.945406 6.3183C1.0298 6.57147 1.21131 6.78075 1.45 6.9001C1.68869 7.01945 1.96502 7.03909 2.2182 6.95469C2.47137 6.8703 2.68065 6.68879 2.8 6.4501C3.43219 5.17342 4.39383 4.08872 5.58555 3.30809C6.77727 2.52746 8.15582 2.07922 9.57876 2.00969C11.0017 1.94017 12.4174 2.25188 13.6795 2.91261C14.9417 3.57334 16.0045 4.55913 16.7581 5.7681C17.5118 6.97706 17.9289 8.36535 17.9664 9.78948C18.0039 11.2136 17.6605 12.6219 16.9715 13.8689C16.2826 15.1159 15.2731 16.1563 14.0475 16.8825C12.8219 17.6088 11.4246 17.9946 10 18.0001C8.50888 18.0066 7.04615 17.5925 5.77969 16.8053C4.51323 16.0182 3.49435 14.89 2.84 13.5501C2.72065 13.3114 2.51137 13.1299 2.2582 13.0455C2.00502 12.9611 1.72869 12.9808 1.49 13.1001C1.25131 13.2194 1.0698 13.4287 0.985406 13.6819C0.901015 13.9351 0.920653 14.2114 1.04 14.4501C1.83283 16.0456 3.03752 17.4003 4.52947 18.3741C6.02142 19.348 7.74645 19.9055 9.52612 19.9891C11.3058 20.0727 13.0755 19.6793 14.6521 18.8496C16.2288 18.0199 17.5552 16.7841 18.4941 15.2699C19.433 13.7558 19.9503 12.0182 19.9925 10.2371C20.0347 8.45597 19.6003 6.69589 18.7342 5.13893C17.8682 3.58197 16.6018 2.28467 15.0663 1.38121C13.5307 0.477745 11.7816 0.000936 10 0.0001Z" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="flex-box">
        <main className="main">
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
                <KpiCard variant="kpi--apt" value="0" label="Today´s Appointments">
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
                <div className="dash-block-title">Today’s Schedule</div>

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
        </main>
      </section>
    </div>
  )
}