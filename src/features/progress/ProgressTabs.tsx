import { NavLink } from 'react-router-dom'
import './progress.css'

const TABS = [
  { to: '/progress', label: 'Grafik' },
  { to: '/records', label: 'Rekor pribadi' },
]

/** Switch between the two halves of the Progres tab (chart vs. PR list). */
export function ProgressTabs() {
  return (
    <nav className="sub-tabs" aria-label="Bagian progres">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => `sub-tabs__link ${isActive ? 'is-active' : ''}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
