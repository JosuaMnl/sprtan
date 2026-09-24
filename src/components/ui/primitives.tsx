import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

type ButtonVariant = 'primary' | 'ink' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonStyle {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  className?: string
}

/**
 * Class list for anything that should look like a button. Exported so router
 * `<Link>`s can wear the button voice without nesting a <button> in an <a>.
 */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
}: ButtonStyle = {}): string {
  return ['btn', `btn-${variant}`, `btn-${size}`, block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...rest}>
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

interface StatRowItem {
  label: string
  value: ReactNode
  unit?: string
}

/** A row of stats split by hairlines — "24:16 Durasi | 154 … | 246 …". */
export function StatRow({ items, className = '' }: { items: StatRowItem[]; className?: string }) {
  return (
    <dl className={['stat-row', className].filter(Boolean).join(' ')}>
      {items.map((it) => (
        <div key={it.label} className="stat-row__item">
          {/* dt must precede dd; CSS flips them so the value reads first. */}
          <dt className="stat-row__label">{it.label}</dt>
          <dd className="stat-row__value num">
            {it.value}
            {it.unit ? <span className="stat-row__unit">{it.unit}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
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
      <span className="empty__title">{title}</span>
      {children}
    </div>
  )
}
