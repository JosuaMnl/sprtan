import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import './PageHeader.css'

interface PageHeaderProps {
  /** Grey first line of the two-tone heading ("Lari" in "Lari / Pagi"). */
  lead?: string
  title: string
  /** Small status line under the heading, e.g. a live dot + time. */
  status?: ReactNode
  actions?: ReactNode
  /** Way back for pages that aren't a bottom-tab destination. */
  back?: { to: string; label: string }
}

export function PageHeader({ lead, title, status, actions, back }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {back ? (
          <Link to={back.to} className="page-head__back">
            <Icon name="arrow" size={16} className="page-head__back-icon" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="page-head__title">
          {lead ? <span className="page-head__lead">{lead}</span> : null}
          <span className="page-head__main">{title}</span>
        </h1>
        {status ? <div className="page-head__status">{status}</div> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  )
}
