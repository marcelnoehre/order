import { useTheme } from '../hooks/useTheme.js'
import { MoonIcon, SunIcon } from './Icons.jsx'

const LOGO_NODES = [
  [16, 6],
  [7, 16],
  [25, 16],
  [16, 26],
]

function TopBar({ onMenuClick }) {
  const [theme, toggleTheme] = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  const onToggle = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }

  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenuClick} aria-label="Toggle navigation">
        <span />
        <span />
        <span />
      </button>
      <h1 className="brand">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <path d="M16 6 L7 16 L16 26 L25 16 Z" className="brand-lines" />
          {LOGO_NODES.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.6" className="brand-node" />
          ))}
        </svg>
        Order
      </h1>
      <div className="topbar-end">
        <p className="slogan">
          Making order <em>visible</em>.
        </p>
        <button
          className="theme-toggle"
          onClick={onToggle}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}

export default TopBar
