import { useCallback, useEffect, useMemo, useState } from 'react'
import MainLayout from '../components/MainLayout'
import { cn, statusPillClasses, ui } from '../components/ui'
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
  const toneClass = {
    blue: 'border-l-[#4190f5]',
    green: 'border-l-[#10b981]',
    amber: 'border-l-[#f59e0b]',
    slate: 'border-l-[#475569]',
    default: 'border-l-[#94a3b8]',
  }[tone] || 'border-l-[#94a3b8]'

  return (
    <div className={cn('min-w-0 rounded-lg border border-mp-line border-l-[5px] bg-white p-3.5', toneClass)}>
      <div className="text-[28px] leading-none font-extrabold text-mp-strong">{value}</div>
      <div className="mt-1.5 text-xs font-extrabold uppercase text-[#64748b]">{label}</div>
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
      <section className="grid w-full gap-4">
        <div className="grid gap-4 rounded-lg border border-mp-line bg-white p-3.5 lg:flex lg:items-end lg:justify-between">
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#ecfdf5] text-[#047857] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8] [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
              <BillingIcon />
            </div>
            <div>
              <h1 className="m-0 text-2xl leading-tight font-extrabold text-mp-strong">Billing</h1>
              <div className="text-xs text-[#64748b]">{claims.length} claims in view</div>
            </div>
          </div>

          <div className="grid w-full items-end gap-2.5 md:grid-cols-2 lg:max-w-[1120px] lg:grid-cols-[minmax(160px,1.15fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_auto]">
            <label className={ui.label}>
              Search
              <input
                className={ui.input}
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Claim or patient"
              />
            </label>

            <label className={ui.label}>
              Status
              <select className={ui.input} name="status" value={filters.status} onChange={handleFilterChange}>
                {claimStatuses.map((status) => (
                  <option key={status || 'all'} value={status}>{humanize(status)}</option>
                ))}
              </select>
            </label>

            <label className={ui.label}>
              Stage
              <select className={ui.input} name="billingStage" value={filters.billingStage} onChange={handleFilterChange}>
                {billingStages.map((stage) => (
                  <option key={stage || 'all'} value={stage}>{humanize(stage)}</option>
                ))}
              </select>
            </label>

            <label className={ui.label}>
              From
              <input
                className={ui.input}
                name="serviceDateFrom"
                type="date"
                value={filters.serviceDateFrom}
                onChange={handleFilterChange}
              />
            </label>

            <label className={ui.label}>
              To
              <input
                className={ui.input}
                name="serviceDateTo"
                type="date"
                value={filters.serviceDateTo}
                onChange={handleFilterChange}
              />
            </label>

            <button className={cn(ui.secondaryButton, 'whitespace-nowrap max-md:w-full')} type="button" onClick={loadClaims} disabled={loading}>
              <RefreshIcon />
              Refresh
            </button>
          </div>
        </div>

        {message ? <div className={ui.warning}>{message}</div> : null}

        <div className="grid gap-3 max-[520px]:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <BillingMetric label="Open Claims" value={metrics.openClaims} tone="blue" />
          <BillingMetric label="Submitted" value={metrics.submitted} tone="green" />
          <BillingMetric label="Insurance AR" value={formatCurrency(metrics.insuranceBalance)} tone="amber" />
          <BillingMetric label="Patient AR" value={formatCurrency(metrics.patientBalance)} tone="slate" />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,430px)]">
          <div className={ui.panel}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className={ui.sectionTitle}>Claim Worklist</div>
                <div className={ui.sectionSubtitle}>{loading ? 'Loading' : `${claims.length} rows`}</div>
              </div>
            </div>

            <div className="overflow-auto rounded-lg border border-[#edf2f7]">
              <table className="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr>
                    {['Claim', 'Patient', 'Date', 'Status', 'Stage', 'Charge', 'Balance'].map((heading) => (
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
                  {claims.map((claim) => (
                    <tr
                      className={cn(
                        'cursor-pointer border-b border-[#eef2f7] hover:bg-[#f2f7ff]',
                        claim.id === activeClaimId ? 'bg-[#f2f7ff]' : '',
                      )}
                      key={claim.id}
                      onClick={() => setActiveClaimId(claim.id)}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <div className="font-extrabold text-mp-strong">{claim.claimNumber}</div>
                        <div className="text-xs text-[#64748b]">{claim.primaryInsuranceName || 'Self pay'}</div>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="font-extrabold text-mp-strong">{claim.patientName || 'Unassigned'}</div>
                        <div className="text-xs text-[#64748b]">#{claim.patientId}</div>
                      </td>
                      <td className="px-3 py-2.5 align-middle">{formatDate(claim.serviceDate)}</td>
                      <td className="px-3 py-2.5 align-middle"><span className={statusPillClasses(claim.status)}>{humanize(claim.status)}</span></td>
                      <td className="px-3 py-2.5 align-middle">{humanize(claim.billingStage)}</td>
                      <td className="px-3 py-2.5 align-middle">{formatCurrency(claim.totalCharge)}</td>
                      <td className="px-3 py-2.5 align-middle">{formatCurrency(Number(claim.insuranceBalance || 0) + Number(claim.patientBalance || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && claims.length === 0 ? (
                <div className={ui.empty}>No claims found.</div>
              ) : null}
            </div>
          </div>

          <aside className="min-w-0">
            <div className={ui.panel}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className={ui.sectionTitle}>Claim Detail</div>
                  <div className={ui.sectionSubtitle}>{activeClaim ? activeClaim.claimNumber : '-'}</div>
                </div>
              </div>

              {activeClaim ? (
                <>
                  <div className="grid gap-2.5">
                    {[
                      ['Patient', activeClaim.patientName],
                      ['Service', formatDate(activeClaim.serviceDate)],
                      ['Insurance', activeClaim.primaryInsuranceName || 'Self pay'],
                      ['Status', `${humanize(activeClaim.status)} / ${humanize(activeClaim.billingStage)}`],
                      ['Provider', activeClaim.providerName || '-'],
                      ['Location', activeClaim.locationName || '-'],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        className={cn(
                          'grid gap-2 pt-2.5 [grid-template-columns:minmax(92px,0.7fr)_minmax(0,1fr)]',
                          index === 0 ? 'border-t-0 pt-0' : 'border-t border-[#eef2f7]',
                        )}
                      >
                        <span className="text-xs font-extrabold uppercase text-[#64748b]">{label}</span>
                        <b className="min-w-0 [overflow-wrap:anywhere] font-bold text-mp-strong">{value}</b>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2.5 max-[520px]:grid-cols-1 md:grid-cols-2">
                    {[
                      ['Charge', formatCurrency(activeClaim.totalCharge)],
                      ['Paid', formatCurrency(activeClaim.totalPaid)],
                      ['Adjustment', formatCurrency(activeClaim.totalAdjustment)],
                      ['Balance', formatCurrency(Number(activeClaim.insuranceBalance || 0) + Number(activeClaim.patientBalance || 0))],
                    ].map(([label, value]) => (
                      <div key={label} className="grid gap-1 rounded-lg border border-[#edf2f7] bg-slate-50 p-2.5">
                        <span className="text-xs font-extrabold uppercase text-[#64748b]">{label}</span>
                        <b className="text-base font-bold text-mp-strong">{value}</b>
                      </div>
                    ))}
                  </div>

                  {activeClaim.diagnoses?.length ? (
                    <div className="mt-3 grid gap-2 border-t border-[#eef2f7] pt-3">
                      <div className="text-xs font-extrabold uppercase text-[#64748b]">Diagnoses</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeClaim.diagnoses.map((diagnosis) => (
                          <span
                            key={diagnosis.id || `${diagnosis.sequence}-${diagnosis.diagnosisCode}`}
                            className="rounded-full bg-[#eef2f7] px-2 py-1 text-xs font-extrabold text-slate-600"
                          >
                            {diagnosis.sequence}. {diagnosis.diagnosisCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 border-t border-[#eef2f7] pt-3">
                    <div className="text-xs font-extrabold uppercase text-[#64748b]">Lines</div>
                    <div className="grid gap-2">
                      {activeClaim.lines?.length ? activeClaim.lines.map((line) => (
                        <div className="grid items-start gap-2 rounded-lg border border-[#edf2f7] p-2.5 [grid-template-columns:minmax(0,1fr)_auto]" key={line.id}>
                          <div className="grid min-w-0 gap-0.5">
                            <b className="text-[13px] font-bold text-mp-strong">{line.procedureCode}</b>
                            <span className="min-w-0 text-xs text-[#64748b] [overflow-wrap:anywhere]">{line.description}</span>
                          </div>
                          <div>{formatCurrency(line.chargeAmount)}</div>
                        </div>
                      )) : (
                        <div className={ui.empty}>No claim lines.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className={ui.empty}>No claim selected.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  )
}
