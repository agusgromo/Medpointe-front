import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/mpointe-3.svg'
import { clearSession } from '../services/session'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/', icon: HomeIcon },
  { key: 'activity', label: 'Patient Activity', to: '/patient-activity', icon: ActivityIcon },
  { key: 'schedule', label: 'Schedule', icon: CalendarIcon, disabled: true },
  { key: 'clinical', label: 'Clinical', icon: ClinicalIcon, disabled: true },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon, disabled: true },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, disabled: true },
]

export default function MainLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  function handleSignOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`dashboard-page-wrapper${isMenuOpen ? ' is-menu-open' : ''}`}>
      <header className="header">
        <div className="flex-box flex-gap-small align-center--flex">
          <button
            className="menu-button--header"
            type="button"
            aria-label="Menu"
            aria-controls="main-navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            <span className="hr-trigger-1" />
            <span className="hr-trigger-2" />
            <span className="hr-trigger-3" />
          </button>

          <div className="logo-wrap">
            <NavLink to="/" aria-label="Dashboard">
              <img src={logo} loading="lazy" alt="MedPointe" className="img-logo" />
            </NavLink>
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

      <section className="flex-box app-shell-body">
        {isMenuOpen ? (
          <nav id="main-navigation" className="nav-secondary" aria-label="Primary">
            <div className="menu-items--nav-secondary">
              <div className="grid">
                {NAV_ITEMS.map((item) => (
                  <MenuItem
                    item={item}
                    key={item.key}
                    onNavigate={() => setIsMenuOpen(false)}
                  />
                ))}
              </div>
            </div>
          </nav>
        ) : null}

        <main className="main">{children}</main>
      </section>
    </div>
  )
}

function MenuItem({ item, onNavigate }) {
  const Icon = item.icon

  if (item.disabled) {
    return (
      <button
        className="menu-item--nav-secondary is-disabled"
        type="button"
        aria-disabled="true"
        title="Module not migrated yet"
      >
        <span className="ico">
          <Icon />
        </span>
        <span className="lbl">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink
      className={({ isActive }) => (
        `menu-item--nav-secondary${isActive ? ' is-active' : ''}`
      )}
      end={item.to === '/'}
      to={item.to}
      onClick={onNavigate}
    >
      <span className="ico">
        <Icon />
      </span>
      <span className="lbl">{item.label}</span>
    </NavLink>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="3 12 7 12 9 6 13 18 15 12 21 12" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  )
}

function ClinicalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="7" x2="12" y2="17" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18l-2 10H5L3 7z" />
      <polyline points="8 7 12 3 16 7" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}
