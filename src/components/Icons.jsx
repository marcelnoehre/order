export function CrossIcon({ className }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </svg>
  )
}

export function PlusIcon({ className }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5 V19 M5 12 H19" />
    </svg>
  )
}

export function ChevronIcon({ className }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6 L15 12 L9 18" />
    </svg>
  )
}

export function SearchIcon({ className }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5 L20 20" />
    </svg>
  )
}

export function SunIcon({ className }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" />
    </svg>
  )
}

export function MoonIcon({ className }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5 A8 8 0 1 1 9.5 4 A6.5 6.5 0 0 0 20 14.5 Z" />
    </svg>
  )
}
