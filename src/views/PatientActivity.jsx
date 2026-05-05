import { useNavigate } from 'react-router-dom'
import avatar from '../assets/patient-avatar.png'
import logo from '../assets/mpointe-3.svg'
import { clearSession } from '../services/session'

const keyInfo = [
  ['Account', '00384271'],
  ['Last Visit', '02/17/23'],
  ['Next Visit', '08/19/25 9:00am'],
  ['PCP', 'Dr. Eliana Park', true],
  ['Regular Provider', 'Dr. Kim', true],
  ['Office', 'Downtown Clinic', true],
  ['Ref Phys', 'Dr. Smith', true],
  ['Balance', '$145.00'],
  ['Portal Enrollment', 'Enrolled'],
]

const contacts = [
  ['Mobile', '(555) 322-0199'],
  ['Email', 'j.doe@example.com', true],
  ['Emergency', 'A. Doe - (555) 980-2211'],
]

const insurance = [
  ['Name', 'BluePeak Health'],
  ['Member ID', 'BPX-2049-1123', true],
  ['Copay (OV)', '$25'],
]

const other = [
  ['Pharmacy', 'Evergreen Pharmacy - (555) 440-2222', true],
  ['Misc 1', 'Something'],
  ['Misc 2', 'Something else'],
  ['Misc 3', 'Another thing'],
]

const actions = [
  'Charge',
  'Payment',
  'Appointments',
  'Ledger',
  'Documents',
  'Chart',
  'Emergency Contact',
  'Employer',
  'Communicate',
  'Print',
  'Favorite',
  'Other',
]

function DotsButton({ label = 'More options' }) {
  return (
    <button className="btn-icon" type="button" aria-label={label} title="More">
      <svg viewBox="0 0 16 4" aria-hidden="true">
        <circle cx="2" cy="2" r="2" />
        <circle cx="8" cy="2" r="2" />
        <circle cx="14" cy="2" r="2" />
      </svg>
    </button>
  )
}

function KvList({ rows }) {
  return (
    <div className="kv">
      {rows.map(([label, value, linky]) => (
        <div className="kv-row" key={label}>
          <div className="kv-k">{label}</div>
          <div className={`kv-v${linky ? ' linky' : ''}`}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function Header() {
  const navigate = useNavigate()

  function handleSignOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
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
                <path d="M10.59 11L8.29 13.29a1 1 0 1 0 1.42 1.42l4-4a1 1 0 0 0 0-1.42l-4-4a1 1 0 1 0-1.42 1.42L10.59 9H1a1 1 0 1 0 0 2h9.59ZM10 0a10 10 0 1 0 9.96 11h-2.02A8 8 0 1 1 10 2V0Z" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

function Card({ className = '', title, children }) {
  return (
    <div className={`pa-card ${className}`}>
      {title ? (
        <div className="card-head">
          <div className="card-title">{title}</div>
          <DotsButton label={`${title} menu`} />
        </div>
      ) : null}
      {children}
    </div>
  )
}

export default function PatientActivity() {
  return (
    <div className="dashboard-page-wrapper">
      <Header />

      <section className="flex-box">
        <main className="main">
          <section id="patient-activity" className="pa-screen">
            <div className="pa-accbar card">
              <label htmlFor="pa-acc-input" className="acc-label">Account:</label>
              <div className="acc-group">
                <input
                  id="pa-acc-input"
                  className="w-input acc-input"
                  type="text"
                  placeholder="Enter patient ID..."
                />
                <button id="pa-acc-go" className="w-button acc-go" type="button">Go</button>
              </div>

              <div className="acc-actions">
                {['Switch patients', 'Patient search', 'Add patient', 'Alert'].map((action) => (
                  <button className="btn-outline acc-btn" title={action} type="button" key={action}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12h16M12 4v16" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>{action}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pa-grid">
              <aside className="pa-col-left">
                <div className="pa-card pi-card">
                  <div className="pi-head">
                    <div className="pi-title">Patient Information</div>
                    <DotsButton />
                  </div>

                  <div className="pi-photo-wrap">
                    <div
                      className="pi-photo"
                      aria-label="Patient"
                      style={{ backgroundImage: `url(${avatar})` }}
                    />
                  </div>

                  <div className="pi-name">Erica Caffrey</div>
                  <div className="pi-meta">
                    <div>Acct: <b>99999.21572-00</b> <span className="sep">-</span> Sex: <b>F</b></div>
                    <div>DOB: <b>1984-01-05</b> <span className="sep">-</span> Age: <b>41y</b></div>
                  </div>
                </div>

                <Card className="keyids-card" title="Key Info">
                  <KvList rows={keyInfo} />
                </Card>

                <Card className="contacts-card" title="Contacts">
                  <KvList rows={contacts} />
                </Card>
              </aside>

              <section className="pa-col-right">
                <div className="pa-row-1">
                  <div className="pa-card overview-card">
                    <div className="card-head with-tabs">
                      <div className="card-title">Overview</div>
                      <div className="ov-tabs" role="tablist" aria-label="Overview sections">
                        <button className="ov-tab is-active" role="tab" aria-selected="true" type="button">
                          Demographics
                        </button>
                        <button className="ov-tab" role="tab" aria-selected="false" type="button">
                          Insurance
                        </button>
                        <button className="ov-tab" role="tab" aria-selected="false" type="button">
                          Resp Party
                        </button>
                      </div>
                    </div>

                    <div className="ov-inner card">
                      <div className="ov-rows">
                        <div className="ov-row">
                          <div className="ov-k">Full name</div>
                          <div className="ov-v">Erica Caffrey</div>
                        </div>
                        <div className="ov-row">
                          <div className="ov-k">Address</div>
                          <div className="ov-v">742 Evergreen Terrace, Springfield, IL 62704</div>
                        </div>
                      </div>

                      <div className="ov-actions">
                        <button id="btn-ov-edit" className="btn-outline" type="button">
                          <span className="ico-pen" aria-hidden="true">Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="pa-card notes-card" aria-label="General Notes">
                    <div className="card-head">
                      <div className="card-title">General Notes</div>
                    </div>

                    <div className="notes-body">
                      <p>OK to call and text; do not leave detailed voicemail.</p>
                      <p>Patient reports mild headache since yesterday evening. No fever.</p>
                    </div>

                    <button id="btn-add-note" className="w-button notes-add edit-note-btn" type="button">
                      Edit Note
                    </button>
                  </aside>
                </div>

                <div className="pa-row-2">
                  <Card className="ins-card" title="Insurance">
                    <KvList rows={insurance} />
                  </Card>

                  <Card className="other-card" title="Other">
                    <KvList rows={other} />
                  </Card>

                  <Card className="fam-card" title="Family Members">
                    <div className="fam-list">
                      <div className="fam-row">
                        <div className="fam-name linky">Alex Doe</div>
                        <div className="fam-meta">Spouse - 36y</div>
                      </div>
                      <div className="fam-row">
                        <div className="fam-name linky">Maya Doe</div>
                        <div className="fam-meta">Child - 6y</div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="pa-row-actions">
                  <div className="pa-card actions-card">
                    <div className="actions-wrap">
                      {actions.map((action) => (
                        <button className="btn-outline action-btn" type="button" key={action}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          <span>{action}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </main>
      </section>
    </div>
  )
}