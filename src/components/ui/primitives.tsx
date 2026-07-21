import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

type ButtonVariant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}

interface CardProps {
  children: ReactNode
  hover?: boolean
  className?: string
}

export function Card({ children, hover = false, className = '' }: CardProps) {
  return (
    <div className={['card', hover ? 'card-hover' : '', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

interface StatTileProps {
  label: string
  value: ReactNode
  unit?: string
  accent?: boolean
}

export function StatTile({ label, value, unit, accent = false }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <span className={`stat-tile__value ${accent ? 'stat-tile__value--accent' : ''}`}>
        {value}
        {unit ? <span className="stat-tile__unit">{unit}</span> : null}
      </span>
    </div>
  )
}

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'pr' | 'laurel'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const cls = variant === 'pr' ? 'badge badge-pr' : variant === 'laurel' ? 'badge badge-laurel' : 'badge'
  return <span className={cls}>{children}</span>
}

interface EmptyStateProps {
  title: string
  children?: ReactNode
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="eyebrow">ΜΟΛΩΝ ΛΑΒΕ</span>
      <span className="empty__title">{title}</span>
      {children}
    </div>
  )
}
