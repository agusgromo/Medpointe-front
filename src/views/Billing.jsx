import { useCallback, useEffect, useMemo, useState } from 'react'
import MainLayout from '../components/MainLayout'
import { getBillingClaim, getBillingClaims } from '../services/billing'

const claimStatuses = [
  '',
  'draft',
  'ready_to_bill',
  'submitted',
  'paid',
  'denied',
  'voided',
]

const billingStages = [
  '',
  'charge_entry',
  'coding_review',
  'ready_to_bill',
  'submitted',
  'follow_up',
  'closed',
]

function humanize(value) {
  if (!value) {
    return 'All'
  }

  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })
}

function statusClass(value) {
  return `pa-pill pa-pill--${String(value || '').toLowerCase().replaceAll('_', '-')}`
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
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

function BillingMetric({ label, value, tone = 'default' }) {
  return (
    <div className={`billing-metric billing-metric--${tone}`}>
      <div className="billing-metric-value">{value}</div>
      <div className="billing-metric-label">{label}</div>
    </div>
  )
}

export default function Billing() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    billingStage: '',
    serviceDateFrom: '',
    serviceDateTo: '',
  })
  const [claims, setClaims] = useState([])
  const [activeClaimId, setActiveClaimId] = useState(null)
  const [claimDetail, setClaimDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const activeClaim = useMemo(() => (
    (claimDetail?.id === activeClaimId ? claimDetail : null)
    || claims.find((claim) => claim.id === activeClaimId)
    || claims[0]
    || null
  ), [activeClaimId, claimDetail, claims])

  const metrics = useMemo(() => {
    const openClaims = claims.filter((claim) => !['paid', 'voided'].includes(claim.status)).length
    const submitted = claims.filter((claim) => claim.status === 'submitted').length
    const insuranceBalance = claims.reduce((sum, claim) => sum + Number(claim.insuranceBalance || 0), 0)
    const patientBalance = claims.reduce((sum, claim) => sum + Number(claim.patientBalance || 0), 0)

    return { openClaims, submitted, insuranceBalance, patientBalance }
  }, [claims])

  const loadClaims = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await getBillingClaims(filters)

      if (response.status === 200 && Array.isArray(response.data)) {
        setClaims(response.data)
        setActiveClaimId((currentId) => {
          if (response.data.some((claim) => claim.id === currentId)) {
            return currentId
          }

          return response.data[0]?.id ?? null
        })
      } else {
        setClaims([])
        setActiveClaimId(null)
        setMessage(response.data?.message || 'Unable to load claims.')
      }
    } catch (error) {
      setClaims([])
      setActiveClaimId(null)
      setMessage(error.message || 'Unable to load claims.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let ignore = false

    async function loadCurrentClaims() {
      try {
        const response = await getBillingClaims(filters)

        if (ignore) {
          return
        }

        if (response.status === 200 && Array.isArray(response.data)) {
          setClaims(response.data)
          setActiveClaimId((currentId) => {
            if (response.data.some((claim) => claim.id === currentId)) {
              return currentId
            }

            return response.data[0]?.id ?? null
          })
        } else {
          setClaims([])
          setActiveClaimId(null)
          setClaimDetail(null)
          setMessage(response.data?.message || 'Unable to load claims.')
        }
      } catch (error) {
        if (!ignore) {
          setClaims([])
          setActiveClaimId(null)
          setClaimDetail(null)
          setMessage(error.message || 'Unable to load claims.')
        }
      }
    }

    loadCurrentClaims()

    return () => {
      ignore = true
    }
  }, [filters])

  useEffect(() => {
    let ignore = false

    async function loadCurrentClaimDetail() {
      if (!activeClaimId) {
        return
      }

      try {
        const response = await getBillingClaim(activeClaimId)

        if (ignore) {
          return
        }

        if (response.status === 200 && response.data) {
          setClaimDetail(response.data)
        } else {
          setClaimDetail(null)
          setMessage(response.data?.message || 'Unable to load claim detail.')
        }
      } catch (error) {
        if (!ignore) {
          setClaimDetail(null)
          setMessage(error.message || 'Unable to load claim detail.')
        }
      }
    }

    loadCurrentClaimDetail()

    return () => {
      ignore = true
    }
  }, [activeClaimId])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <MainLayout>
      <section className="billing-screen">
        <div className="billing-topbar">
          <div className="billing-title-block">
            <div className="billing-title-icon">
              <BillingIcon />
            </div>
            <div>
              <h1>Billing</h1>
              <div className="billing-subtitle">{claims.length} claims in view</div>
            </div>
          </div>

          <div className="billing-controls">
            <label>
              Search
              <input
                className="w-input"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Claim or patient"
              />
            </label>

            <label>
              Status
              <select className="w-input" name="status" value={filters.status} onChange={handleFilterChange}>
                {claimStatuses.map((status) => (
                  <option key={status || 'all'} value={status}>{humanize(status)}</option>
                ))}
              </select>
            </label>

            <label>
              Stage
              <select className="w-input" name="billingStage" value={filters.billingStage} onChange={handleFilterChange}>
                {billingStages.map((stage) => (
                  <option key={stage || 'all'} value={stage}>{humanize(stage)}</option>
                ))}
              </select>
            </label>

            <label>
              From
              <input
                className="w-input"
                name="serviceDateFrom"
                type="date"
                value={filters.serviceDateFrom}
                onChange={handleFilterChange}
              />
            </label>

            <label>
              To
              <input
                className="w-input"
                name="serviceDateTo"
                type="date"
                value={filters.serviceDateTo}
                onChange={handleFilterChange}
              />
            </label>

            <button className="btn-outline billing-refresh" type="button" onClick={loadClaims} disabled={loading}>
              <RefreshIcon />
              Refresh
            </button>
          </div>
        </div>

        {message ? <div className="pa-alert">{message}</div> : null}

        <div className="billing-metrics">
          <BillingMetric label="Open Claims" value={metrics.openClaims} tone="blue" />
          <BillingMetric label="Submitted" value={metrics.submitted} tone="green" />
          <BillingMetric label="Insurance AR" value={formatCurrency(metrics.insuranceBalance)} tone="amber" />
          <BillingMetric label="Patient AR" value={formatCurrency(metrics.patientBalance)} tone="slate" />
        </div>

        <div className="billing-layout">
          <div className="billing-panel billing-worklist">
            <div className="billing-panel-head">
              <div>
                <div className="billing-panel-title">Claim Worklist</div>
                <div className="billing-panel-subtitle">{loading ? 'Loading' : `${claims.length} rows`}</div>
              </div>
            </div>

            <div className="billing-table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Charge</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr
                      className={claim.id === activeClaimId ? 'is-selected' : ''}
                      key={claim.id}
                      onClick={() => setActiveClaimId(claim.id)}
                    >
                      <td>
                        <div className="billing-claim-number">{claim.claimNumber}</div>
                        <div className="billing-cell-sub">{claim.primaryInsuranceName || 'Self pay'}</div>
                      </td>
                      <td>
                        <div className="billing-patient">{claim.patientName || 'Unassigned'}</div>
                        <div className="billing-cell-sub">#{claim.patientId}</div>
                      </td>
                      <td>{formatDate(claim.serviceDate)}</td>
                      <td><span className={statusClass(claim.status)}>{humanize(claim.status)}</span></td>
                      <td>{humanize(claim.billingStage)}</td>
                      <td>{formatCurrency(claim.totalCharge)}</td>
                      <td>{formatCurrency(Number(claim.insuranceBalance || 0) + Number(claim.patientBalance || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && claims.length === 0 ? (
                <div className="pa-empty">No claims found.</div>
              ) : null}
            </div>
          </div>

          <aside className="billing-side">
            <div className="billing-panel billing-detail">
              <div className="billing-panel-head">
                <div>
                  <div className="billing-panel-title">Claim Detail</div>
                  <div className="billing-panel-subtitle">{activeClaim ? activeClaim.claimNumber : '-'}</div>
                </div>
              </div>

              {activeClaim ? (
                <>
                  <div className="billing-detail-list">
                    <div>
                      <span>Patient</span>
                      <b>{activeClaim.patientName}</b>
                    </div>
                    <div>
                      <span>Service</span>
                      <b>{formatDate(activeClaim.serviceDate)}</b>
                    </div>
                    <div>
                      <span>Insurance</span>
                      <b>{activeClaim.primaryInsuranceName || 'Self pay'}</b>
                    </div>
                    <div>
                      <span>Status</span>
                      <b>{humanize(activeClaim.status)} / {humanize(activeClaim.billingStage)}</b>
                    </div>
                    <div>
                      <span>Provider</span>
                      <b>{activeClaim.providerName || '-'}</b>
                    </div>
                    <div>
                      <span>Location</span>
                      <b>{activeClaim.locationName || '-'}</b>
                    </div>
                  </div>

                  <div className="billing-totals">
                    <div>
                      <span>Charge</span>
                      <b>{formatCurrency(activeClaim.totalCharge)}</b>
                    </div>
                    <div>
                      <span>Paid</span>
                      <b>{formatCurrency(activeClaim.totalPaid)}</b>
                    </div>
                    <div>
                      <span>Adjustment</span>
                      <b>{formatCurrency(activeClaim.totalAdjustment)}</b>
                    </div>
                    <div>
                      <span>Balance</span>
                      <b>{formatCurrency(Number(activeClaim.insuranceBalance || 0) + Number(activeClaim.patientBalance || 0))}</b>
                    </div>
                  </div>

                  {activeClaim.diagnoses?.length ? (
                    <div className="billing-section">
                      <div className="billing-section-title">Diagnoses</div>
                      <div className="billing-diagnoses">
                        {activeClaim.diagnoses.map((diagnosis) => (
                          <span key={diagnosis.id || `${diagnosis.sequence}-${diagnosis.diagnosisCode}`}>
                            {diagnosis.sequence}. {diagnosis.diagnosisCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="billing-section">
                    <div className="billing-section-title">Lines</div>
                    <div className="billing-line-list">
                      {activeClaim.lines?.length ? activeClaim.lines.map((line) => (
                        <div className="billing-line" key={line.id}>
                          <div>
                            <b>{line.procedureCode}</b>
                            <span>{line.description}</span>
                          </div>
                          <div>{formatCurrency(line.chargeAmount)}</div>
                        </div>
                      )) : (
                        <div className="pa-empty">No claim lines.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="pa-empty">No claim selected.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  )
}
