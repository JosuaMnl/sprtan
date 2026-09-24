import { Link, Outlet, useLocation } from 'react-router-dom'
import { Lambda } from '../ui/Lambda'
import { Icon, type IconName } from '../ui/Icon'
import { useTheme } from '../../settings/ThemeContext'
import './AppShell.css'

interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Route prefixes that light this item up (sub-pages count as the parent). */
  match: string[]
}

/** Four destinations only. Rekor lives inside Progres, Gerakan inside Catat,
 *  Pengaturan behind the gear icon. */
const NAV: NavItem[] = [
  { to: '/', label: 'Beranda', icon: 'home', match: [] },
  { to: '/log', label: 'Catat', icon: 'plus', match: ['/log', '/exercises'] },
  { to: '/run', label: 'Lari', icon: 'run', match: ['/run'] },
  { to: '/progress', label: 'Progres', icon: 'chart', match: ['/progress', '/records'] },
]

function isActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/'
  return item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function AppShell() {
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const onSettings = pathname === '/settings' || pathname === '/privasi'
  const nextLabel = theme === 'dark' ? 'Mode terang' : 'Mode gelap'

  const themeButton = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Ganti ke ${nextLabel.toLowerCase()}`}
      title={nextLabel}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      <span className="theme-toggle__label">{nextLabel}</span>
    </button>
  )

  return (
    <div className="shell">
      {/* Hash routing owns location.hash, so focus <main> directly instead of
          following "#main" (which the router would read as a route). */}
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Lewati ke konten
      </a>

      <header className="rail">
        <Link to="/" className="rail__brand" aria-label="Sprtan, ke beranda">
          <Lambda size={32} />
          <span className="rail__wordmark">SPRTAN</span>
        </Link>

        <nav className="rail__nav" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const active = isActive(item, pathname)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rail__link ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={item.icon} className="rail__link-icon" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="rail__foot">
          {themeButton}
          <Link
            to="/settings"
            className={`rail__settings ${onSettings ? 'is-active' : ''}`}
            aria-current={onSettings ? 'page' : undefined}
            aria-label="Pengaturan"
          >
            <Icon name="gear" />
            <span className="rail__settings-label">Pengaturan</span>
          </Link>
          <p className="rail__meta">
            Data tersimpan di perangkat ·{' '}
            <Link to="/privasi" className="rail__foot-link">
              Privasi
            </Link>
          </p>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Navigasi bawah">
        {NAV.map((item) => {
          const active = isActive(item, pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`tabbar__link ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tabbar__icon">
                <Icon name={item.icon} size={22} />
              </span>
              <span className="tabbar__label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
