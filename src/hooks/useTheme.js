import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const STORAGE_KEY = 'order.theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      return
    }
  }, [theme])

  const toggle = useCallback((origin) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce || !origin) {
      setTheme(next)
      return
    }
    const root = document.documentElement
    root.style.setProperty('--reveal-x', `${origin.x}px`)
    root.style.setProperty('--reveal-y', `${origin.y}px`)
    document.startViewTransition(() => {
      flushSync(() => setTheme(next))
      root.dataset.theme = next
    })
  }, [theme])

  return [theme, toggle]
}
