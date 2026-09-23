import type { ReactNode } from 'react'

export type IconName =
  | 'home'
  | 'plus'
  | 'chart'
  | 'run'
  | 'trophy'
  | 'list'
  | 'gear'
  | 'sun'
  | 'moon'
  | 'play'
  | 'pause'
  | 'stop'
  | 'arrow'
  | 'clock'
  | 'share'
  | 'trash'

/** Hand-drawn 24px stroke icons. Stroke follows `currentColor`. */
const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chart: <path d="M4 19h16M6 15l4-4 3 3 5-6" />,
  run: (
    <>
      <circle cx="14.5" cy="4.5" r="1.8" />
      <path d="m7 21 3.2-5.2 3.3 2.2V21M9.5 12.5l1.8-4.3 3.7 1.3 2 3.3M11.3 8.2 7.8 9.6 6.5 12.5M10.2 15.8l1.6-4" />
    </>
  ),
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z" />
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  gear: (
    <>
      <path d="M9.8 4.9 L10.3 2.5 L13.7 2.5 L14.2 4.9 L15.5 5.5 L17.5 4.1 L19.9 6.5 L18.5 8.5 L19.1 9.8 L21.5 10.3 L21.5 13.7 L19.1 14.2 L18.5 15.5 L19.9 17.5 L17.5 19.9 L15.5 18.5 L14.2 19.1 L13.7 21.5 L10.3 21.5 L9.8 19.1 L8.5 18.5 L6.5 19.9 L4.1 17.5 L5.5 15.5 L4.9 14.2 L2.5 13.7 L2.5 10.3 L4.9 9.8 L5.5 8.5 L4.1 6.5 L6.5 4.1 L8.5 5.5 Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  play: <path d="M8 5.5v13l10-6.5z" fill="currentColor" />,
  pause: <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l2.5 2M10 2.5h4" />
    </>
  ),
  share: <path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />,
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
