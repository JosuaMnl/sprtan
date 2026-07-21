import type { ReactNode } from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-head__title">{title}</h1>
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  )
}
