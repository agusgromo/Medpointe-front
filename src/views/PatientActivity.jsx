import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { cn, statusPillClasses, ui } from '../components/ui'
import avatar from '../assets/patient-avatar.png'
import {
  createPatient,
  getLanguages,
  getPatientActivity,
  getPatientSearchOptions,
  getPreviousPatients,
  searchPatients,
  updatePatientAlert,
} from '../services/patients'

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

const sexOptions = [
  { value: '', label: 'Select' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'unknown', label: 'Unknown' },
]

const maritalStatusOptions = [
  { value: '', label: 'Select' },
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
]

const employmentStatusOptions = [
  { value: '', label: 'Select' },
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
]

const communicationOptions = [
  { value: '', label: 'Select' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'home_phone', label: 'Home phone' },
  { value: 'email', label: 'Email' },
  { value: 'mail', label: 'Mail' },
]

const emptyPatientForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  nickname: '',
  dateOfBirth: '',
  sexAtBirth: '',
  genderIdentity: '',
  pronouns: '',
  maritalStatus: '',
  employmentStatus: '',
  preferredLanguageId: '',
  ethnicity: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  homePhone: '',
  workPhone: '',
  mobilePhone: '',
  email: '',
  communicationPreference: '',
}

const emptyPatientSearchForm = {
  account: '',
  lastName: '',
  firstName: '',
  searchIdentityHistory: false,
  dateOfBirth: '',
  lastTreatmentDate: '',
  homePhone: '',
  workPhone: '',
  cellPhone: '',
  insurancePlan: '',
  insuranceCarrier: '',
  providerId: '',
  billingStatus: '',
}

const billingStatusLabels = {
  COL: 'Collections',
  PCOL: 'Pre-Collections',
  REG: 'Regular',
  WIP: 'Write-In Patient',
}

function DotsButton({ label = 'More options' }) {
  return (
    <button className={ui.iconButton} type="button" aria-label={label} title="More">
      <svg viewBox="0 0 16 4" aria-hidden="true" className="h-4 w-4 fill-current">
        <circle cx="2" cy="2" r="2" />
        <circle cx="8" cy="2" r="2" />
        <circle cx="14" cy="2" r="2" />
      </svg>
    </button>
  )
}

function Card({ className = '', title, children }) {
  return (
    <div className={cn(ui.panel, className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="font-extrabold text-mp-strong">{title}</div>
          <DotsButton label={`${title} menu`} />
        </div>
      ) : null}
      {children}
    </div>
  )
}

function KvList({ rows }) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, value, linky]) => (
        <div className="grid items-start gap-2.5 [grid-template-columns:minmax(96px,0.9fr)_minmax(0,1.1fr)] max-[720px]:grid-cols-1" key={label}>
          <div className="text-xs font-bold uppercase text-[#7a8798]">{label}</div>
          <div className={cn('min-w-0 text-right font-semibold text-mp-strong [overflow-wrap:anywhere] max-[720px]:text-left', linky ? 'text-[#2563eb]' : '')}>
            {value === 0 ? 0 : value || '-'}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message = 'No data' }) {
  return <div className={ui.empty}>{message}</div>
}

function InsurancePlanTabs({ policies, selectedId, onSelect }) {
  if (!policies?.length || policies.length === 1) {
    return null
  }

  return (
    <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Insurance plans">
      {policies.map((policy) => (
        <button
          type="button"
          role="tab"
          aria-selected={String(policy.id) === String(selectedId)}
          className={`rounded border px-3 py-1.5 text-xs font-semibold leading-tight transition-colors ${
            String(policy.id) === String(selectedId)
              ? 'border-sky-600 bg-sky-50 text-sky-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
          key={policy.id}
          onClick={() => onSelect(policy.id)}
        >
          {policy.priority ? `${policy.priority}. ` : ''}
          {policy.carrierName || 'Insurance'}
        </button>
      ))}
    </div>
  )
}

function StatusPill({ value }) {
  if (!value) {
    return null
  }

  return <span className={statusPillClasses(value)}>{humanize(value)}</span>
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
  const leading = patient?.lastName ? `${patient.lastName},` : ''
  return [leading, patient?.firstName, patient?.middleName].filter(Boolean).join(' ')
}

function humanize(value) {
  if (!value) {
    return ''
  }

  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatBillingStatus(value) {
  if (!value) {
    return ''
  }

  const trimmed = String(value).trim()
  return billingStatusLabels[trimmed] || humanize(trimmed)
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function normalizePhoneInput(value) {
  const digits = digitsOnly(value).slice(0, 10)

  if (!digits) {
    return ''
  }

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

function buildSearchFieldsFromQuery(initialQuery = '') {
  const trimmed = initialQuery.trim()

  if (!trimmed) {
    return { ...emptyPatientSearchForm }
  }

  if (/^\d+$/.test(trimmed)) {
    return {
      ...emptyPatientSearchForm,
      account: trimmed,
    }
  }

  if (trimmed.includes(',')) {
    const [lastName, firstName] = trimmed.split(',', 2)

    return {
      ...emptyPatientSearchForm,
      lastName: lastName.trim(),
      firstName: (firstName || '').trim(),
    }
  }

  if (trimmed.includes(' ')) {
    const [lastName, ...firstNameParts] = trimmed.split(' ')

    return {
      ...emptyPatientSearchForm,
      lastName: lastName.trim(),
      firstName: firstNameParts.join(' ').trim(),
    }
  }

  return {
    ...emptyPatientSearchForm,
    lastName: trimmed,
  }
}

function buildPatientSearchPayload(fields) {
  return {
    account: fields.account.trim(),
    lastName: fields.lastName.trim(),
    firstName: fields.firstName.trim(),
    history: fields.searchIdentityHistory ? 'Y' : 'N',
    dateOfBirth: fields.dateOfBirth || '',
    lastTreatmentDate: fields.lastTreatmentDate || '',
    homePhone: digitsOnly(fields.homePhone),
    workPhone: digitsOnly(fields.workPhone),
    cellPhone: digitsOnly(fields.cellPhone),
    insurancePlan: fields.insurancePlan.trim(),
    insuranceCarrier: fields.insuranceCarrier.trim(),
    providerId: fields.providerId || '',
    billingStatus: fields.billingStatus || '',
  }
}

function hasPatientSearchCriteria(fields) {
  return Object.values(buildPatientSearchPayload(fields)).some(Boolean)
}

function patientSelectorColumns(patient) {
  return [
    searchResultName(patient),
    formatDate(patient?.dateOfBirth),
    humanize(patient?.sexAtBirth),
    patient?.id ? String(patient.id) : '',
  ]
}

function matchesPatientPickerQuery(patient, query) {
  const needle = String(query || '').trim().toLowerCase()

  if (!needle) {
    return true
  }

  return [
    patient?.lastName,
    patient?.firstName,
    searchResultName(patient),
    fullName(patient),
    patient?.id ? String(patient.id) : '',
  ].some((value) => String(value || '').toLowerCase().includes(needle))
}

function hasPatientAlert(activity) {
  return Boolean(activity?.patient?.alert?.trim())
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

function OverviewRows({ tab, activity, insurancePolicies, insurancePolicy, onInsuranceSelect }) {
  const patient = activity?.patient
  const contact = activity?.contact
  const selectedInsurance = insurancePolicy || activity?.insurancePolicies?.[0]

  const rows = {
    Demographics: [
      ['Full name', fullName(patient)],
      ['Address', addressText(contact)],
      ['Date of birth', formatDate(patient?.dateOfBirth)],
      ['Sex', patient?.sexAtBirth],
      ['Gender Identity', patient?.genderIdentity],
      ['Language', patient?.preferredLanguage],
      ['Marital status', humanize(patient?.maritalStatus)],
      ['Employment', humanize(patient?.employmentStatus)],
      ['Ethnicity', patient?.ethnicity],
    ],
    Insurance: [
      ['Carrier', selectedInsurance?.carrierName],
      ['Member ID', selectedInsurance?.memberId],
      ['Group', selectedInsurance?.groupNumber || selectedInsurance?.groupName],
      ['Subscriber', selectedInsurance?.subscriberName],
      ['Relationship', humanize(selectedInsurance?.relationshipToPatient)],
      ['Copay', formatCurrency(selectedInsurance?.copay)],
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

  if (tab === 'Insurance') {
    if (!insurancePolicies?.length) {
      return <EmptyState message="No insurance plans on file." />
    }

    return (
      <div className="grid gap-2">
        <InsurancePlanTabs
          policies={insurancePolicies}
          selectedId={selectedInsurance?.id}
          onSelect={onInsuranceSelect}
        />
        {rows.map(([label, value]) => (
          <div className="grid items-start gap-2.5 [grid-template-columns:minmax(96px,0.9fr)_minmax(0,1.1fr)] max-[720px]:grid-cols-1" key={label}>
            <div className="text-xs font-bold uppercase text-[#7a8798]">{label}</div>
            <div className="min-w-0 text-right font-semibold text-mp-strong [overflow-wrap:anywhere] max-[720px]:text-left">
              {value === 0 ? 0 : value || '-'}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div className="grid items-start gap-2.5 [grid-template-columns:minmax(96px,0.9fr)_minmax(0,1.1fr)] max-[720px]:grid-cols-1" key={label}>
          <div className="text-xs font-bold uppercase text-[#7a8798]">{label}</div>
          <div className="min-w-0 text-right font-semibold text-mp-strong [overflow-wrap:anywhere] max-[720px]:text-left">
            {value === 0 ? 0 : value || '-'}
          </div>
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
    <div className="grid gap-3">
      {items.slice(0, 12).map((item, index) => (
        <div className="grid gap-3 border-t border-[#eef2f7] py-2.5 [grid-template-columns:92px_minmax(0,1fr)] first:border-t-0 first:pt-0 max-[720px]:grid-cols-1" key={`${item.type}-${item.occurredAt}-${index}`}>
          <div className="text-xs font-bold text-[#64748b]">{formatDate(item.occurredAt)}</div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 font-bold text-mp-strong [overflow-wrap:anywhere]">{item.title}</span>
              <StatusPill value={item.status || item.type} />
            </div>
            {item.detail ? <div className="text-xs text-[#64748b]">{item.detail}</div> : null}
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

  return <div className="grid gap-2.5">{items.slice(0, 6).map(renderItem)}</div>
}

function ModalCloseButton({ onClick }) {
  return (
    <button
      className={ui.iconButton}
      type="button"
      aria-label="Close"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  )
}

function ModalFrame({ title, subtitle, children, footer, onClose, maxWidth = 'max-w-[960px]' }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/30 p-5 max-[520px]:items-stretch max-[520px]:p-2.5" role="presentation">
      <section
        className={`max-h-[calc(100vh-40px)] w-full ${maxWidth} overflow-auto rounded-lg border border-[#d9e2ea] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] max-[520px]:max-h-[calc(100vh-20px)]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-frame-title"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#edf2f7] px-[18px] py-4 max-[520px]:px-3.5">
          <div>
            <h2 id="modal-frame-title" className="m-0 text-[22px] font-extrabold text-mp-strong">{title}</h2>
            {subtitle ? <p className="mt-[3px] mb-0 text-sm text-mp-muted">{subtitle}</p> : null}
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="grid gap-4 px-[18px] py-4 max-[520px]:px-3.5">
          {children}
        </div>

        {footer ? (
          <div className="flex items-center justify-between gap-4 border-t border-[#edf2f7] bg-[#fbfdff] px-[18px] py-4 max-[520px]:px-3.5">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function PatientSelectorTable({
  patients,
  selectedPatientId,
  currentPatientId,
  onSelect,
  onOpen,
  emptyMessage,
}) {
  return (
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
            const isCurrent = String(patient.id) === String(currentPatientId)
            const [name, dob, sex, account] = patientSelectorColumns(patient)

            return (
              <button
                type="button"
                className={cn(
                  'grid w-full grid-cols-[minmax(0,1.6fr)_132px_88px_96px] items-center gap-0 border-t border-[#eef2f7] px-3 py-3 text-left text-sm text-mp-text first:border-t-0 hover:bg-[#f8fbff] max-[760px]:grid-cols-1 max-[760px]:gap-1',
                  isSelected ? 'bg-[#eef5ff]' : 'bg-white',
                )}
                key={patient.id}
                onClick={() => onSelect(patient.id)}
                onDoubleClick={() => onOpen(patient.id)}
              >
                <div className="min-w-0 font-extrabold text-mp-strong [overflow-wrap:anywhere]">
                  {name}
                  {isCurrent ? ' (Current)' : ''}
                </div>
                <div className="text-[#475569] max-[760px]:text-xs max-[760px]:font-semibold max-[760px]:uppercase max-[760px]:text-[#64748b]">{dob || '-'}</div>
                <div className="text-[#475569] max-[760px]:text-xs max-[760px]:font-semibold max-[760px]:uppercase max-[760px]:text-[#64748b]">{sex || '-'}</div>
                <div className="text-[#475569] max-[760px]:text-xs max-[760px]:font-semibold max-[760px]:uppercase max-[760px]:text-[#64748b]">{account || '-'}</div>
              </button>
            )
          })
        ) : (
          <div className={ui.empty}>{emptyMessage}</div>
        )}
      </div>
    </div>
  )
}

function AddPatientModal({ languages, onClose, onCreated }) {
  const [form, setForm] = useState(emptyPatientForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const defaultLanguageId = languages.find((language) => language.name?.toLowerCase() === 'english')?.id ?? languages[0]?.id ?? ''
  const selectedLanguageId = form.preferredLanguageId || (defaultLanguageId ? String(defaultLanguageId) : '')

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const createdPatient = await createPatient({
        ...form,
        preferredLanguageId: selectedLanguageId ? Number(selectedLanguageId) : null,
      })
      if (createdPatient.status === 201) onCreated(createdPatient.data)
      else setError(createdPatient.data.message)
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/30 p-5 max-[520px]:items-stretch max-[520px]:p-2.5" role="presentation">
      <section
        className="max-h-[calc(100vh-40px)] w-full max-w-[920px] overflow-auto rounded-lg border border-[#d9e2ea] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] max-[520px]:max-h-[calc(100vh-20px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-patient-title"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4 border-b border-[#edf2f7] px-[18px] py-4 max-[520px]:px-3.5">
            <div>
              <h2 id="add-patient-title" className="m-0 text-[22px] font-extrabold text-mp-strong">Add Patient</h2>
              <p className="mt-[3px] mb-0 text-sm text-mp-muted">New patient demographics</p>
            </div>
            <button className={ui.iconButton} type="button" aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>

          {error ? <div className={cn(ui.message, 'mx-[18px] max-[520px]:mx-3.5')}>{error}</div> : null}

          <div className="grid gap-4 px-[18px] py-4 max-[520px]:px-3.5">
            <fieldset>
              <legend className="pb-3 font-extrabold text-mp-strong">Identity</legend>
              <div className="grid gap-3 md:grid-cols-4 max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
                <label className={ui.label}>
                  <span>First Name</span>
                  <input className={ui.input} name="firstName" value={form.firstName} onChange={updateField} required />
                </label>
                <label className={ui.label}>
                  <span>Middle</span>
                  <input className={ui.input} name="middleName" value={form.middleName} onChange={updateField} maxLength="1" />
                </label>
                <label className={ui.label}>
                  <span>Last Name</span>
                  <input className={ui.input} name="lastName" value={form.lastName} onChange={updateField} required />
                </label>
                <label className={ui.label}>
                  <span>Suffix</span>
                  <input className={ui.input} name="suffix" value={form.suffix} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Date of Birth</span>
                  <input className={ui.input} name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateField} required />
                </label>
                <label className={ui.label}>
                  <span>Sex</span>
                  <select className={ui.input} name="sexAtBirth" value={form.sexAtBirth} onChange={updateField} required>
                    {sexOptions.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className={ui.label}>
                  <span>Nickname</span>
                  <input className={ui.input} name="nickname" value={form.nickname} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Preferred Language</span>
                  <select className={ui.input} name="preferredLanguageId" value={selectedLanguageId} onChange={updateField} required>
                    <option value="">Select</option>
                    {languages.map((language) => (
                      <option value={language.id} key={language.id}>{language.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="pb-3 font-extrabold text-mp-strong">Contact</legend>
              <div className="grid gap-3 md:grid-cols-4 max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
                <label className={cn(ui.label, 'md:col-span-2 max-[520px]:col-span-1')}>
                  <span>Address</span>
                  <input className={ui.input} name="addressLine1" value={form.addressLine1} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Address 2</span>
                  <input className={ui.input} name="addressLine2" value={form.addressLine2} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>City</span>
                  <input className={ui.input} name="city" value={form.city} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>State</span>
                  <input className={ui.input} name="state" value={form.state} onChange={updateField} maxLength="2" />
                </label>
                <label className={ui.label}>
                  <span>Zip</span>
                  <input className={ui.input} name="postalCode" value={form.postalCode} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Mobile</span>
                  <input className={ui.input} name="mobilePhone" value={form.mobilePhone} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Home</span>
                  <input className={ui.input} name="homePhone" value={form.homePhone} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Work</span>
                  <input className={ui.input} name="workPhone" value={form.workPhone} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Email</span>
                  <input className={ui.input} name="email" type="email" value={form.email} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Preference</span>
                  <select className={ui.input} name="communicationPreference" value={form.communicationPreference} onChange={updateField}>
                    {communicationOptions.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="pb-3 font-extrabold text-mp-strong">Other</legend>
              <div className="grid gap-3 md:grid-cols-4 max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
                <label className={ui.label}>
                  <span>Marital Status</span>
                  <select className={ui.input} name="maritalStatus" value={form.maritalStatus} onChange={updateField}>
                    {maritalStatusOptions.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className={ui.label}>
                  <span>Employment</span>
                  <select className={ui.input} name="employmentStatus" value={form.employmentStatus} onChange={updateField}>
                    {employmentStatusOptions.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className={ui.label}>
                  <span>Ethnicity</span>
                  <input className={ui.input} name="ethnicity" value={form.ethnicity} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Gender Identity</span>
                  <input className={ui.input} name="genderIdentity" value={form.genderIdentity} onChange={updateField} />
                </label>
                <label className={ui.label}>
                  <span>Pronouns</span>
                  <input className={ui.input} name="pronouns" value={form.pronouns} onChange={updateField} />
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#edf2f7] bg-[#fbfdff] px-[18px] py-4 max-[520px]:px-3.5">
            <button className={ui.secondaryButton} type="button" onClick={onClose}>Cancel</button>
            <button className={cn(ui.primaryButton, 'min-w-[150px]')} type="submit" disabled={submitting}>
              {submitting ? 'Saving' : 'Save Patient'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PatientSearchModal({
  initialQuery = '',
  providerOptions,
  billingStatusOptions,
  onClose,
  onOpenAddPatient,
  onSelect,
}) {
  const [fields, setFields] = useState(() => buildSearchFieldsFromQuery(initialQuery))
  const [results, setResults] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [showingPrevious, setShowingPrevious] = useState(() => !initialQuery.trim())

  const loadPreviousPatients = useCallback(async () => {
    setSearching(true)
    setShowingPrevious(true)
    setMessage('')

    try {
      const response = await getPreviousPatients()

      if (response.status !== 200 || !Array.isArray(response.data)) {
        setResults([])
        setSelectedPatientId(null)
        setMessage(response?.data?.message || 'Unable to load previously opened patients.')
        return
      }

      setResults(response.data)
      setSelectedPatientId(response.data[0]?.id ?? null)

      if (response.data.length === 0) {
        setMessage('No previously opened patients.')
      }
    } catch (error) {
      setResults([])
      setSelectedPatientId(null)
      setMessage(error.message || 'Unable to load previously opened patients.')
    } finally {
      setSearching(false)
    }
  }, [])

  async function performSearch(criteria) {
    setSearching(true)
    setShowingPrevious(false)
    setMessage('')

    try {
      const response = await searchPatients(criteria)

      if (response.status !== 200 || !Array.isArray(response.data)) {
        setResults([])
        setSelectedPatientId(null)
        setMessage(response?.data?.message || 'Unable to search patients.')
        return
      }

      setResults(response.data)
      setSelectedPatientId(response.data[0]?.id ?? null)

      if (response.data.length === 0) {
        setMessage('No matching patients found.')
      }
    } catch (error) {
      setResults([])
      setSelectedPatientId(null)
      setMessage(error.message || 'Unable to search patients.')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const query = initialQuery.trim()

    if (!query) {
      const timeoutId = window.setTimeout(() => {
        void loadPreviousPatients()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    async function autoSearch() {
      setSearching(true)
      setShowingPrevious(false)
      setMessage('')

      try {
        const response = await searchPatients({ search: query })

        if (response.status !== 200 || !Array.isArray(response.data)) {
          setResults([])
          setSelectedPatientId(null)
          setMessage(response?.data?.message || 'Unable to search patients.')
          return
        }

        setResults(response.data)
        setSelectedPatientId(response.data[0]?.id ?? null)

        if (response.data.length === 0) {
          setMessage('No matching patients found.')
        }
      } catch (error) {
        setResults([])
        setSelectedPatientId(null)
        setMessage(error.message || 'Unable to search patients.')
      } finally {
        setSearching(false)
      }
    }

    void autoSearch()
  }, [initialQuery, loadPreviousPatients])

  function updateField(event) {
    const { name, value, type, checked } = event.target

    setFields((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : ['homePhone', 'workPhone', 'cellPhone'].includes(name)
            ? normalizePhoneInput(value)
            : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!hasPatientSearchCriteria(fields)) {
      setResults([])
      setSelectedPatientId(null)
      setMessage('Enter at least one search field.')
      return
    }

    await performSearch(buildPatientSearchPayload(fields))
  }

  async function handleOpenSelected() {
    if (!selectedPatientId) {
      setMessage('Select a patient first.')
      return
    }

    await onSelect(selectedPatientId)
  }

  return (
    <ModalFrame
      title="Patient Search"
      subtitle="Search and select a patient"
      onClose={onClose}
      footer={(
        <>
          <button className={ui.secondaryButton} type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={ui.secondaryButton} type="button" onClick={() => void loadPreviousPatients()}>
            Previous
          </button>
          <button className={ui.secondaryButton} type="button" onClick={onOpenAddPatient}>
            New Patient
          </button>
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <button className={ui.secondaryButton} type="button" onClick={handleOpenSelected} disabled={!selectedPatientId}>
              Open Patient
            </button>
            <button className={ui.primaryButton} type="submit" form="patient-search-form" disabled={searching}>
              {searching ? 'Searching' : 'Search'}
            </button>
          </div>
        </>
      )}
    >
      <form id="patient-search-form" className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 xl:grid-cols-3 md:grid-cols-2 max-[520px]:grid-cols-1">
          <label className={ui.label}>
            <span>Account</span>
            <input className={ui.input} name="account" value={fields.account} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Last Name</span>
            <input className={ui.input} name="lastName" value={fields.lastName} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>First Name</span>
            <input className={ui.input} name="firstName" value={fields.firstName} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Date of Birth</span>
            <input className={ui.input} type="date" name="dateOfBirth" value={fields.dateOfBirth} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Date of Last Treatment</span>
            <input className={ui.input} type="date" name="lastTreatmentDate" value={fields.lastTreatmentDate} onChange={updateField} />
          </label>
          <div className={cn(ui.label, 'flex items-end pb-[2px]')}>
            <span className="sr-only">Search Identity History Info</span>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[#d9e2ea] bg-white px-3 text-sm font-semibold text-mp-strong">
              <input
                type="checkbox"
                name="searchIdentityHistory"
                checked={fields.searchIdentityHistory}
                onChange={updateField}
              />
              <span>Search Identity History Info</span>
            </label>
          </div>
          <label className={ui.label}>
            <span>Phone Home</span>
            <input className={ui.input} name="homePhone" value={fields.homePhone} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Phone Work</span>
            <input className={ui.input} name="workPhone" value={fields.workPhone} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Phone Cell</span>
            <input className={ui.input} name="cellPhone" value={fields.cellPhone} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Insurance Plan</span>
            <input className={ui.input} name="insurancePlan" value={fields.insurancePlan} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Insurance Carrier</span>
            <input className={ui.input} name="insuranceCarrier" value={fields.insuranceCarrier} onChange={updateField} />
          </label>
          <label className={ui.label}>
            <span>Regular Provider</span>
            <select className={ui.input} name="providerId" value={fields.providerId} onChange={updateField}>
              <option value="">All Providers</option>
              {providerOptions.map((provider) => (
                <option value={provider.id} key={provider.id}>{provider.name}</option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            <span>Billing Status</span>
            <select className={ui.input} name="billingStatus" value={fields.billingStatus} onChange={updateField}>
              <option value="">All Statuses</option>
              {billingStatusOptions.map((status) => (
                <option value={status.value} key={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
        </div>
      </form>

      {message ? <div className={ui.message}>{message}</div> : null}

      {showingPrevious ? (
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
          Previously opened patients
        </div>
      ) : null}

      <PatientSelectorTable
        patients={results}
        selectedPatientId={selectedPatientId}
        currentPatientId={null}
        onSelect={setSelectedPatientId}
        onOpen={onSelect}
        emptyMessage={
          searching
            ? (showingPrevious ? 'Loading previously opened patients...' : 'Searching...')
            : (showingPrevious ? 'No previously opened patients.' : 'Search results will appear here.')
        }
      />
    </ModalFrame>
  )
}

function SwitchPatientModal({ currentPatientId, onClose, onOpenAddPatient, onSelect }) {
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState(currentPatientId ?? null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterQuery, setFilterQuery] = useState('')

  const filteredPatients = useMemo(
    () => patients.filter((patient) => matchesPatientPickerQuery(patient, filterQuery)),
    [filterQuery, patients],
  )
  const effectiveSelectedPatientId = filteredPatients.some((patient) => String(patient.id) === String(selectedPatientId))
    ? selectedPatientId
    : (filteredPatients[0]?.id ?? null)

  useEffect(() => {
    async function loadPreviousPatients() {
      setLoading(true)
      setMessage('')

      try {
        const response = await getPreviousPatients()

        if (response.status !== 200 || !Array.isArray(response.data)) {
          setPatients([])
          setMessage(response?.data?.message || 'Unable to load previously opened patients.')
          return
        }

        setPatients(response.data)
        setSelectedPatientId(response.data[0]?.id ?? currentPatientId ?? null)

        if (response.data.length === 0) {
          setMessage('No previously opened patients.')
        }
      } catch (error) {
        setPatients([])
        setMessage(error.message || 'Unable to load previously opened patients.')
      } finally {
        setLoading(false)
      }
    }

    void loadPreviousPatients()
  }, [currentPatientId])

  async function handleOpenSelected() {
    if (!effectiveSelectedPatientId) {
      setMessage('Select a patient first.')
      return
    }

    await onSelect(effectiveSelectedPatientId)
  }

  return (
    <ModalFrame
      title="Switch Patient"
      subtitle="Previously opened patients"
      onClose={onClose}
      footer={(
        <>
          <button className={ui.secondaryButton} type="button" onClick={onClose}>
            Close
          </button>
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <button className={ui.secondaryButton} type="button" onClick={onOpenAddPatient}>
              New Patient
            </button>
            <button className={ui.primaryButton} type="button" onClick={handleOpenSelected} disabled={!selectedPatientId}>
              Open Patient
            </button>
          </div>
        </>
      )}
    >
      {message ? <div className={ui.message}>{message}</div> : null}

      <label className={ui.label}>
        <span>Name</span>
        <input
          className={ui.input}
          type="text"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder="Enter a few letters of last name, first initial"
        />
      </label>

      <PatientSelectorTable
        patients={filteredPatients}
        selectedPatientId={effectiveSelectedPatientId}
        currentPatientId={currentPatientId}
        onSelect={setSelectedPatientId}
        onOpen={onSelect}
        emptyMessage={
          loading
            ? 'Loading previously opened patients...'
            : (filterQuery.trim() ? 'No matching previously opened patients.' : 'No previously opened patients.')
        }
      />
    </ModalFrame>
  )
}

function PatientAlertModal({ patient, onClose, onSaved }) {
  const [alertText, setAlertText] = useState(patient?.alert || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave() {
    if (!patient?.id) {
      setMessage('Select a patient first.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await updatePatientAlert(patient.id, alertText)

      if (response.status !== 204) {
        setMessage(response?.data?.message || 'Unable to save the patient alert.')
        return
      }

      onSaved(alertText)
      onClose()
    } catch (error) {
      setMessage(error.message || 'Unable to save the patient alert.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame
      title="Patient Alert"
      subtitle={fullName(patient) || 'Patient'}
      onClose={onClose}
      maxWidth="max-w-[720px]"
      footer={(
        <>
          <button className={ui.secondaryButton} type="button" onClick={onClose}>
            Close
          </button>
          <button className={cn(ui.secondaryButton, 'ml-auto')} type="button" onClick={() => setAlertText('')}>
            Clear
          </button>
          <button className={ui.primaryButton} type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving' : 'Save Alert'}
          </button>
        </>
      )}
    >
      <label className={ui.label}>
        <span>Alert</span>
        <textarea
          className={cn(ui.textarea, 'min-h-[220px]')}
          value={alertText}
          onChange={(event) => setAlertText(event.target.value)}
        />
      </label>

      {message ? <div className={ui.message}>{message}</div> : null}
    </ModalFrame>
  )
}

export default function PatientActivity() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accountValue, setAccountValue] = useState('')
  const [activity, setActivity] = useState(null)
  const [activeTab, setActiveTab] = useState('Demographics')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false)
  const [isSwitchPatientOpen, setIsSwitchPatientOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [languages, setLanguages] = useState([])
  const [providerOptions, setProviderOptions] = useState([])
  const [billingStatusOptions, setBillingStatusOptions] = useState([])
  const [patientSearchSeed, setPatientSearchSeed] = useState('')
  const [selectedInsuranceId, setSelectedInsuranceId] = useState(null)
  const inputRef = useRef(null)
  const autoOpenedAlertPatientIdRef = useRef(null)
  const routePatientId = searchParams.get('patientId')?.trim() || ''

  const patient = activity?.patient
  const contact = activity?.contact
  const insurancePolicies = activity?.insurancePolicies || []
  const selectedInsurance = insurancePolicies.find((policy) => String(policy.id) === String(selectedInsuranceId))
    || insurancePolicies.find((policy) => policy.isActive)
    || insurancePolicies[0]
  const summaryInsurance = insurancePolicies.find((policy) => policy.isActive) || insurancePolicies[0]
  const primaryPharmacy = activity?.pharmacies?.find((pharmacy) => pharmacy.type === 'primary') || activity?.pharmacies?.[0]
  const latestNote = activity?.notes?.[0]
  const showDemographicsCards = activeTab === 'Demographics'
  const showClinicalCards = activeTab === 'Clinical'

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [languageResponse, searchOptionsResponse] = await Promise.all([
          getLanguages(),
          getPatientSearchOptions(),
        ])

        if (Array.isArray(languageResponse.data)) {
          setLanguages(languageResponse.data)
        } else {
          setLanguages([])
          setMessage(languageResponse?.data?.message || 'Unable to load languages.')
        }

        if (searchOptionsResponse.status === 200 && searchOptionsResponse.data) {
          setProviderOptions(Array.isArray(searchOptionsResponse.data.providers) ? searchOptionsResponse.data.providers : [])
          setBillingStatusOptions(Array.isArray(searchOptionsResponse.data.billingStatuses) ? searchOptionsResponse.data.billingStatuses : [])
        } else {
          setProviderOptions([])
          setBillingStatusOptions([])
          setMessage(searchOptionsResponse?.data?.message || 'Unable to load patient search options.')
        }
      } catch (error) {
        setMessage(error.message || 'Unable to load patient reference data.')
      }
    }

    void loadReferenceData()
  }, [])

  useEffect(() => {
    const patientId = activity?.patient?.id

    if (!patientId) {
      return
    }

    if (hasPatientAlert(activity) && autoOpenedAlertPatientIdRef.current !== String(patientId)) {
      setIsAlertOpen(true)
      autoOpenedAlertPatientIdRef.current = String(patientId)
      return
    }

    if (!hasPatientAlert(activity)) {
      autoOpenedAlertPatientIdRef.current = String(patientId)
    }
  }, [activity])

  const keyInfo = useMemo(() => ([
    ['Account', patient?.id],
    ['Last Visit', formatDate(patient?.lastVisitDate)],
    ['Next Visit', formatDateTime(patient?.nextAppointmentStart)],
    ['PCP', patient?.primaryProviderName, true],
    ['Office', patient?.primaryLocationName, true],
    ['Status', humanize(patient?.status)],
  ]), [patient])

  const contacts = useMemo(() => ([
    ['Mobile', contact?.mobilePhone],
    ['Home', contact?.homePhone],
    ['Work', contact?.workPhone],
    ['Email', contact?.email, true],
    ['Preference', humanize(contact?.communicationPreference)],
  ]), [contact])

  const insurance = useMemo(() => ([
    ['Name', summaryInsurance?.carrierName],
    ['Member ID', summaryInsurance?.memberId, true],
    ['Group', summaryInsurance?.groupNumber],
    ['Subscriber', summaryInsurance?.subscriberName],
    ['Copay', formatCurrency(summaryInsurance?.copay)],
  ]), [summaryInsurance])

  const other = useMemo(() => ([
    ['Pharmacy', primaryPharmacy?.displayName || primaryPharmacy?.name, true],
    ['Billing Status', formatBillingStatus(patient?.billingStatus)],
    ['Classification', patient?.classification],
    ['Category', patient?.category],
  ]), [patient, primaryPharmacy])

  const loadActivity = useCallback(async (patientId) => {
    setLoading(true)
    setMessage('')

    try {
      const response = await getPatientActivity(patientId)

      if (response.status !== 200) {
        setMessage(response.data.message)
        return
      }

      setSelectedInsuranceId(null)
      setActivity(response.data)
      setAccountValue(String(response.data.patient.id))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!/^\d+$/.test(routePatientId)) {
      return
    }

    let cancelled = false

    async function loadFromRoute() {
      await loadActivity(routePatientId)

      if (!cancelled) {
        navigate('/patient-activity', { replace: true })
      }
    }

    void loadFromRoute()

    return () => {
      cancelled = true
    }
  }, [loadActivity, navigate, routePatientId])

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

    setPatientSearchSeed(query)
    setIsPatientSearchOpen(true)
  }

  async function handlePatientCreated(createdPatient) {
    setIsAddPatientOpen(false)
    await loadActivity(createdPatient.id)
  }

  async function handlePatientSelected(patientId) {
    setIsPatientSearchOpen(false)
    setIsSwitchPatientOpen(false)
    setIsAlertOpen(false)
    setPatientSearchSeed('')
    await loadActivity(patientId)
  }

  function openAddPatientModal() {
    setIsPatientSearchOpen(false)
    setIsSwitchPatientOpen(false)
    setPatientSearchSeed('')
    setIsAddPatientOpen(true)
  }

  function handleAlertSaved(nextAlert) {
    setActivity((currentActivity) => {
      if (!currentActivity) {
        return currentActivity
      }

      return {
        ...currentActivity,
        patient: {
          ...currentActivity.patient,
          alert: nextAlert.trim(),
        },
      }
    })
  }

  function openAlertPanel() {
    if (!activity?.patient?.id) {
      setMessage('Select a patient first.')
      return
    }

    setIsAlertOpen(true)
  }

  return (
    <MainLayout>
      <section id="patient-activity" className="w-full">
        <form className={cn(ui.barePanel, 'my-2 grid gap-3 max-[860px]:grid-cols-1 lg:flex lg:items-center')} onSubmit={handleSearch}>
          <label htmlFor="pa-acc-input" className="font-bold text-mp-strong">Account:</label>
          <div className="flex min-w-0 lg:min-w-[320px] lg:flex-1">
            <input
              ref={inputRef}
              id="pa-acc-input"
              className={cn(ui.input, 'rounded-r-none border-r-0')}
              type="text"
              value={accountValue}
              onChange={(event) => setAccountValue(event.target.value)}
              placeholder="ID or name..."
            />
            <button
              id="pa-acc-go"
              className={cn(ui.primaryButton, 'min-w-[72px] rounded-l-none')}
              type="submit"
              disabled={loading}
            >
              {loading ? 'Loading' : 'Go'}
            </button>
          </div>

          <div className="ml-auto flex flex-wrap gap-2 max-[860px]:w-full lg:justify-end">
            <button
              className={cn(ui.secondaryButton, 'max-[520px]:w-full max-[520px]:justify-start')}
              title="Switch patients"
              type="button"
              onClick={() => setIsSwitchPatientOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-2">
                <path d="M7 7h13M17 3l4 4-4 4M17 17H4M7 13l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Switch patients</span>
            </button>
            <button
              className={cn(ui.secondaryButton, 'max-[520px]:w-full max-[520px]:justify-start')}
              title="Patient search"
              type="button"
              onClick={() => {
                setPatientSearchSeed('')
                setIsPatientSearchOpen(true)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="m16 16 5 5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Patient search</span>
            </button>
            <button className={cn(ui.secondaryButton, 'max-[520px]:w-full max-[520px]:justify-start')} title="Add patient" type="button" onClick={openAddPatientModal}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-2">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Add patient</span>
            </button>
            <button className={cn(ui.secondaryButton, 'max-[520px]:w-full max-[520px]:justify-start')} title="Alert" type="button" onClick={openAlertPanel}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-2">
                <path d="M12 3 2 21h20L12 3zM12 9v5M12 17h.01" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Alert</span>
            </button>
          </div>
        </form>

        {isAddPatientOpen ? (
          <AddPatientModal
            languages={languages}
            onClose={() => setIsAddPatientOpen(false)}
            onCreated={handlePatientCreated}
          />
        ) : null}

        {isPatientSearchOpen ? (
          <PatientSearchModal
            initialQuery={patientSearchSeed}
            providerOptions={providerOptions}
            billingStatusOptions={billingStatusOptions}
            onClose={() => {
              setIsPatientSearchOpen(false)
              setPatientSearchSeed('')
            }}
            onOpenAddPatient={openAddPatientModal}
            onSelect={handlePatientSelected}
          />
        ) : null}

        {isSwitchPatientOpen ? (
          <SwitchPatientModal
            currentPatientId={activity?.patient?.id}
            onClose={() => setIsSwitchPatientOpen(false)}
            onOpenAddPatient={openAddPatientModal}
            onSelect={handlePatientSelected}
          />
        ) : null}

        {isAlertOpen && activity ? (
          <PatientAlertModal
            patient={activity.patient}
            onClose={() => setIsAlertOpen(false)}
            onSaved={handleAlertSaved}
          />
        ) : null}

        {message ? <div className={ui.message}>{message}</div> : null}

        {hasPatientAlert(activity) ? (
          <button
            type="button"
            className={cn(ui.warning, 'flex w-full items-start justify-between gap-3 text-left')}
            onClick={openAlertPanel}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{activity.patient.alert}</span>
            <span className="shrink-0 font-extrabold uppercase">Edit</span>
          </button>
        ) : null}

        {!activity ? (
          <div className={cn(ui.panel, 'grid min-h-[220px] place-content-center text-center')}>
            <div className="text-[28px] font-extrabold text-mp-strong">Patient Activity</div>
            <div className="mt-2 text-mp-muted">Enter a patient id or search by last name.</div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.36fr)_minmax(0,1fr)]">
            <aside className="grid min-w-0 content-start gap-4">
              <div className={cn(ui.panel, 'text-center')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-extrabold text-mp-strong">Patient Information</div>
                  <DotsButton />
                </div>

                <div className="my-2.5 flex justify-center">
                  <div
                    className="h-[104px] w-[104px] rounded-full border-4 border-[#edf3f8] bg-gray-100 bg-cover bg-center"
                    aria-label="Patient"
                    style={{ backgroundImage: `url(${avatar})` }}
                  />
                </div>

                <div className="text-xl font-extrabold text-mp-strong">{fullName(patient)}</div>
                <div className="mt-2 grid gap-1 text-[13px] text-[#64748b]">
                  <div>Acct: <b>{patient.id}</b> <span className="text-[#b0b7c3]">-</span> Sex: <b>{humanize(patient.sexAtBirth)}</b></div>
                  <div>DOB: <b>{formatDate(patient.dateOfBirth)}</b> <span className="text-[#b0b7c3]">-</span> Age: <b>{ageText(patient.dateOfBirth)}</b></div>
                </div>
              </div>

              <Card title="Key Info">
                <KvList rows={keyInfo} />
              </Card>

              <Card title="Contacts">
                <KvList rows={contacts} />
              </Card>
            </aside>

            <section className="grid min-w-0 content-start gap-4">
              <div className={cn('grid gap-4', showDemographicsCards ? 'xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.36fr)]' : 'grid-cols-1')}>
                <div className={ui.panel}>
                  <div className="mb-3 grid gap-3 sm:flex sm:items-start sm:justify-between">
                    <div className="font-extrabold text-mp-strong">Overview</div>
                    <div className="flex flex-wrap gap-2 sm:justify-end" role="tablist" aria-label="Overview sections">
                      {overviewTabs.map((tab) => (
                        <button
                          className={cn(
                            'min-h-8 rounded-full border px-2.5 py-1.5 font-bold',
                            activeTab === tab
                              ? 'border-[#cfe7ff] bg-[#e9f5ff] text-[#2563eb]'
                              : 'border-[#d7e1ea] bg-white text-[#64748b]',
                          )}
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

                  <div className={cn(ui.subPanel, 'border p-3.5')}>
                    <OverviewRows
                      tab={activeTab}
                      activity={activity}
                      insurancePolicies={insurancePolicies}
                      insurancePolicy={selectedInsurance}
                      onInsuranceSelect={setSelectedInsuranceId}
                    />

                    <div className="mt-3 flex justify-end">
                      <button id="btn-ov-edit" className={ui.secondaryButton} type="button">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                {showDemographicsCards ? (
                  <aside className={cn(ui.panel, 'grid grid-rows-[auto_minmax(120px,1fr)_auto]')} aria-label="General Notes">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="font-extrabold text-mp-strong">General Notes</div>
                    </div>

                    <div className="overflow-auto leading-6 text-slate-700">
                      {latestNote ? (
                        <>
                          <p className="mb-2.5">{latestNote.body}</p>
                          <div className="text-xs text-[#64748b]">{formatDateTime(latestNote.createdAt)}</div>
                        </>
                      ) : (
                        <EmptyState message="No notes" />
                      )}
                    </div>

                    <button id="btn-add-note" className={cn(ui.primaryButton, 'mt-3')} type="button">
                      Edit Note
                    </button>
                  </aside>
                ) : null}
              </div>

              {showDemographicsCards ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  <Card title="Insurance">
                    {insurancePolicies.length ? (
                      <KvList rows={insurance} />
                    ) : (
                      <EmptyState message="No insurance plans" />
                    )}
                  </Card>

                  <Card title="Other">
                    <KvList rows={other} />
                  </Card>

                  <Card title="Recent Visits">
                    <CompactList
                      items={activity.visits}
                      empty="No visits"
                      renderItem={(visit) => (
                        <div className="flex items-center justify-between gap-3 border-t border-[#eef2f7] py-2 first:border-t-0 first:pt-0" key={visit.id}>
                          <div>
                            <div className="font-bold text-[#2563eb]">{formatDate(visit.visitDate)}</div>
                            <div className="text-xs text-[#64748b]">
                              {[visit.providerName || visit.visitType || 'Visit', vitalsText(visit)].filter(Boolean).join(' | ')}
                            </div>
                          </div>
                          <StatusPill value={visit.status} />
                        </div>
                      )}
                    />
                  </Card>
                </div>
              ) : null}

              {showClinicalCards ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <Card title="Timeline">
                    <Timeline items={activity.timeline} />
                  </Card>

                  <Card title="Clinical">
                    <CompactList
                      items={[
                        ...activity.problems.map((item) => ({ ...item, kind: 'Problem', title: item.description })),
                        ...activity.allergies.map((item) => ({ ...item, kind: 'Allergy', title: item.allergen })),
                        ...activity.medications.map((item) => ({ ...item, kind: 'Medication', title: item.medicationName })),
                        ...activity.orders.map((item) => ({ ...item, kind: humanize(item.orderType), title: item.description })),
                      ]}
                      empty="No clinical records"
                      renderItem={(item) => (
                        <div className="flex items-center justify-between gap-3 border-t border-[#eef2f7] py-2 first:border-t-0 first:pt-0" key={`${item.kind}-${item.id}`}>
                          <div>
                            <div className="font-bold text-mp-strong">{item.title}</div>
                            <div className="text-xs text-[#64748b]">{item.kind}</div>
                          </div>
                          <StatusPill value={item.status} />
                        </div>
                      )}
                    />
                  </Card>
                </div>
              ) : null}

              <div className="grid">
                <div className={cn(ui.panel, 'p-3')}>
                  <div className="grid gap-2 max-[720px]:grid-cols-1 md:grid-cols-4 xl:grid-cols-6">
                    {actions.map((action) => (
                      <button className={cn(ui.secondaryButton, 'min-w-0')} type="button" key={action}>
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-2">
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
