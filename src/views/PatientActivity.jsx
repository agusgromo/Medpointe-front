import { useMemo, useRef, useState } from 'react'
import MainLayout from '../components/MainLayout'
import avatar from '../assets/patient-avatar.png'
import { getPatientActivity, searchPatients } from '../services/patients'

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

const overviewTabs = ['Demographics', 'Insurance', 'Clinical']

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

function KvList({ rows }) {
  return (
    <div className="kv">
      {rows.map(([label, value, linky]) => (
        <div className="kv-row" key={label}>
          <div className="kv-k">{label}</div>
          <div className={`kv-v${linky ? ' linky' : ''}`}>{value === 0 ? 0 : value || '-'}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message = 'No data' }) {
  return <div className="pa-empty">{message}</div>
}

function StatusPill({ value }) {
  if (!value) {
    return null
  }

  return <span className={`pa-pill pa-pill--${String(value).toLowerCase().replaceAll('_', '-')}`}>{humanize(value)}</span>
}

function fullName(person) {
  if (!person) {
    return ''
  }

  return [person.firstName, person.middleName, person.lastName, person.suffix]
    .filter(Boolean)
    .join(' ')
}

function searchResultName(patient) {
  const lastName = patient.lastName + ","
  return [lastName, patient.middleName, patient.firstName].filter(Boolean).join(' ')
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
  if (value === null || value === undefined) {
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

  if (visit.systolicBp && visit.diastolicBp) {
    values.push(`BP ${Math.round(visit.systolicBp)}/${Math.round(visit.diastolicBp)}`)
  }

  if (visit.heartRate) {
    values.push(`HR ${Math.round(visit.heartRate)}`)
  }

  if (visit.bmi) {
    values.push(`BMI ${Number(visit.bmi).toFixed(1)}`)
  }

  return values.join(' | ')
}

function OverviewRows({ tab, activity }) {
  const patient = activity?.patient
  const contact = activity?.contact
  const primaryInsurance = activity?.insurancePolicies?.[0]

  const rows = {
    Demographics: [
      ['Full name', fullName(patient)],
      ['Address', addressText(contact)],
      ['Language', patient?.preferredLanguage],
      ['Marital status', humanize(patient?.maritalStatus)],
      ['Employment', humanize(patient?.employmentStatus)],
      ['Ethnicity', patient?.ethnicity],
    ],
    Insurance: [
      ['Primary carrier', primaryInsurance?.carrierName],
      ['Member ID', primaryInsurance?.memberId],
      ['Group', primaryInsurance?.groupNumber || primaryInsurance?.groupName],
      ['Subscriber', primaryInsurance?.subscriberName],
      ['Relationship', humanize(primaryInsurance?.relationshipToPatient)],
      ['Copay', formatCurrency(primaryInsurance?.copay)],
    ],
    Clinical: [
      ['Problems', activity?.problems?.filter((problem) => problem.status === 'active').length],
      ['Allergies', activity?.allergies?.filter((allergy) => allergy.status === 'active').length],
      ['Active meds', activity?.medications?.filter((med) => med.status === 'active').length],
      ['Open orders', activity?.orders?.filter((order) => !['completed', 'cancelled'].includes(order.status)).length],
      ['Last visit', formatDate(patient?.lastVisitDate)],
      ['Next visit', formatDateTime(patient?.nextAppointmentStart)],
    ],
  }[tab]

  return (
    <div className="ov-rows">
      {rows.map(([label, value]) => (
        <div className="ov-row" key={label}>
          <div className="ov-k">{label}</div>
          <div className="ov-v">{value === 0 ? 0 : value || '-'}</div>
        </div>
      ))}
    </div>
  )
}

function Timeline({ items }) {
  if (!items?.length) {
    return <EmptyState message="No activity yet" />
  }

  return (
    <div className="pa-timeline">
      {items.slice(0, 12).map((item, index) => (
        <div className="pa-timeline-row" key={`${item.type}-${item.occurredAt}-${index}`}>
          <div className="pa-time">{formatDate(item.occurredAt)}</div>
          <div className="pa-timeline-main">
            <div className="pa-timeline-title">
              <span>{item.title}</span>
              <StatusPill value={item.status || item.type} />
            </div>
            {item.detail ? <div className="pa-timeline-detail">{item.detail}</div> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function CompactList({ items, renderItem, empty }) {
  if (!items?.length) {
    return <EmptyState message={empty} />
  }

  return <div className="pa-compact-list">{items.slice(0, 6).map(renderItem)}</div>
}

export default function PatientActivity() {
  const [accountValue, setAccountValue] = useState('')
  const [activity, setActivity] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [activeTab, setActiveTab] = useState('Demographics')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  const patient = activity?.patient
  const contact = activity?.contact
  const activeInsurance = activity?.insurancePolicies?.find((policy) => policy.isActive) || activity?.insurancePolicies?.[0]
  const latestNote = activity?.notes?.[0]

  const keyInfo = useMemo(() => ([
    ['Account', patient?.id],
    ['Last Visit', formatDate(patient?.lastVisitDate)],
    ['Next Visit', formatDateTime(patient?.nextAppointmentStart)],
    ['PCP', patient?.primaryProviderName, true],
    ['Office', patient?.primaryLocationName, true],
    ['Status', humanize(patient?.status)],
    ['Class', patient?.classification],
    ['Category', patient?.category],
  ]), [patient])

  const contacts = useMemo(() => ([
    ['Mobile', contact?.mobilePhone],
    ['Home', contact?.homePhone],
    ['Work', contact?.workPhone],
    ['Email', contact?.email, true],
    ['Preference', humanize(contact?.communicationPreference)],
  ]), [contact])

  const insurance = useMemo(() => ([
    ['Name', activeInsurance?.carrierName],
    ['Member ID', activeInsurance?.memberId, true],
    ['Group', activeInsurance?.groupNumber],
    ['Subscriber', activeInsurance?.subscriberName],
    ['Copay', formatCurrency(activeInsurance?.copay)],
  ]), [activeInsurance])

  const other = useMemo(() => ([
    ['Language', patient?.preferredLanguage],
    ['Ethnicity', patient?.ethnicity],
    ['Gender', patient?.genderIdentity],
    ['Pronouns', patient?.pronouns],
    ['Stage', patient?.stage],
  ]), [patient])

  async function loadActivity(patientId) {
    setLoading(true)
    setMessage('')

    try {
      const data = await getPatientActivity(patientId)
      setActivity(data)
      setSearchResults([])
      setAccountValue(String(data.patient.id))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(event) {
    event?.preventDefault()
    const query = accountValue.trim()

    if (!query) {
      inputRef.current?.focus()
      return
    }

    if (/^\d+$/.test(query)) {
      await loadActivity(query)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const results = await searchPatients(query)
      setSearchResults(results)

      if (results.length === 1) {
        await loadActivity(results[0].id)
      } else if (results.length === 0) {
        setMessage('No matching patients found.')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <section id="patient-activity" className="pa-screen">
            <form className="pa-accbar card" onSubmit={handleSearch}>
              <label htmlFor="pa-acc-input" className="acc-label">Account:</label>
              <div className="acc-group">
                <input
                  ref={inputRef}
                  id="pa-acc-input"
                  className="w-input acc-input"
                  type="text"
                  value={accountValue}
                  onChange={(event) => setAccountValue(event.target.value)}
                  placeholder="ID or name..."
                />
                <button id="pa-acc-go" className="w-button acc-go" type="submit" disabled={loading}>
                  {loading ? 'Loading' : 'Go'}
                </button>
              </div>

              <div className="acc-actions">
                <button className="btn-outline acc-btn" title="Switch patients" type="button" onClick={() => setActivity(null)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 7h13M17 3l4 4-4 4M17 17H4M7 13l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Switch patients</span>
                </button>
                <button className="btn-outline acc-btn" title="Patient search" type="button" onClick={handleSearch}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="m16 16 5 5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Patient search</span>
                </button>
                <button className="btn-outline acc-btn" title="Add patient" type="button">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Add patient</span>
                </button>
                <button className="btn-outline acc-btn" title="Alert" type="button">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 2 21h20L12 3zM12 9v5M12 17h.01" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Alert</span>
                </button>
              </div>
            </form>

            {message ? <div className="pa-message">{message}</div> : null}

            {searchResults.length > 1 ? (
              <div className="pa-search-results">
                {searchResults.map((result) => (
                  <button type="button" className="pa-search-row" key={result.id} onClick={() => loadActivity(result.id)}>
                    <span className="pa-search-name">{searchResultName(result)}</span>
                    <span>{formatDate(result.dateOfBirth)} | {humanize(result.sexAtBirth)} | #{result.id}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {!activity ? (
              <div className="pa-start pa-card">
                <div className="pa-start-title">Patient Activity</div>
                <div className="pa-start-subtitle">Enter a patient id or search by last name.</div>
              </div>
            ) : (
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

                    <div className="pi-name">{fullName(patient)}</div>
                    <div className="pi-meta">
                      <div>Acct: <b>{patient.id}</b> <span className="sep">-</span> Sex: <b>{humanize(patient.sexAtBirth)}</b></div>
                      <div>DOB: <b>{formatDate(patient.dateOfBirth)}</b> <span className="sep">-</span> Age: <b>{ageText(patient.dateOfBirth)}</b></div>
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
                          {overviewTabs.map((tab) => (
                            <button
                              className={`ov-tab${activeTab === tab ? ' is-active' : ''}`}
                              role="tab"
                              aria-selected={activeTab === tab}
                              type="button"
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="ov-inner card">
                        <OverviewRows tab={activeTab} activity={activity} />

                        <div className="ov-actions">
                          <button id="btn-ov-edit" className="btn-outline" type="button">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>

                    <aside className="pa-card notes-card" aria-label="General Notes">
                      <div className="card-head">
                        <div className="card-title">General Notes</div>
                      </div>

                      <div className="notes-body">
                        {latestNote ? (
                          <>
                            <p>{latestNote.body}</p>
                            <div className="pa-note-date">{formatDateTime(latestNote.createdAt)}</div>
                          </>
                        ) : (
                          <EmptyState message="No notes" />
                        )}
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

                    <Card className="fam-card" title="Recent Visits">
                      <CompactList
                        items={activity.visits}
                        empty="No visits"
                        renderItem={(visit) => (
                          <div className="fam-row" key={visit.id}>
                            <div>
                              <div className="fam-name linky">{formatDate(visit.visitDate)}</div>
                              <div className="fam-meta">
                                {[visit.providerName || visit.visitType || 'Visit', vitalsText(visit)].filter(Boolean).join(' | ')}
                              </div>
                            </div>
                            <StatusPill value={visit.status} />
                          </div>
                        )}
                      />
                    </Card>
                  </div>

                  <div className="pa-row-3">
                    <Card className="activity-card" title="Timeline">
                      <Timeline items={activity.timeline} />
                    </Card>

                    <Card className="clinical-card" title="Clinical">
                      <CompactList
                        items={[
                          ...activity.problems.map((item) => ({ ...item, kind: 'Problem', title: item.description })),
                          ...activity.allergies.map((item) => ({ ...item, kind: 'Allergy', title: item.allergen })),
                          ...activity.medications.map((item) => ({ ...item, kind: 'Medication', title: item.medicationName })),
                          ...activity.orders.map((item) => ({ ...item, kind: humanize(item.orderType), title: item.description })),
                        ]}
                        empty="No clinical records"
                        renderItem={(item) => (
                          <div className="pa-clinical-row" key={`${item.kind}-${item.id}`}>
                            <div>
                              <div className="pa-clinical-title">{item.title}</div>
                              <div className="pa-clinical-meta">{item.kind}</div>
                            </div>
                            <StatusPill value={item.status} />
                          </div>
                        )}
                      />
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
            )}
      </section>
    </MainLayout>
  )
}