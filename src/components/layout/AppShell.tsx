import { NavLink, Outlet } from 'react-router-dom'
import { Lambda } from '../ui/Lambda'
import './AppShell.css'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV: NavItem[] = [
  { to: '/', label: 'Arena', icon: '⌂' },
  { to: '/log', label: 'Catat', icon: '✎' },
  { to: '/progress', label: 'Progres', icon: '📈' },
  { to: '/records', label: 'Rekor', icon: '🏛' },
  { to: '/exercises', label: 'Gerakan', icon: '≡' },
  { to: '/settings', label: 'Atur', icon: '⚙' },
]

export function AppShell() {
  return (
    <div className="shell">
      <header className="rail">
        <div className="rail__brand">
          <Lambda size={34} />
          <span className="rail__wordmark">SPRTAN</span>
        </div>
        <nav className="rail__nav" aria-label="Navigasi utama">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rail__link ${isActive ? 'is-active' : ''}`
              }
            >
              <span className="rail__link-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="rail__foot">
          Sprtan v0.1
          <br />
          ΜΟΛΩΝ ΛΑΒΕ
        </p>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Navigasi bawah">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `tabbar__link ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="tabbar__icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
