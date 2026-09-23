interface LambdaProps {
  size?: number
  className?: string
  title?: string
}

/** Spartan lambda (Λ) badge — the app's logomark. Hand-built SVG. */
export function Lambda({ size = 32, className, title = 'Sprtan' }: LambdaProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect x="2" y="2" width="60" height="60" rx="18" fill="var(--color-accent)" />
      <path d="M32 15 L45 49 L38.5 49 L32 30.5 L25.5 49 L19 49 Z" fill="var(--color-accent-ink)" />
    </svg>
  )
}
