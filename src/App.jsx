import { useEffect, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import SideNav from './components/SideNav.jsx'
import ContextTable from './components/ContextTable.jsx'
import { findContext, loadContext } from './data/contexts.js'

const NAV_WIDTH_KEY = 'order.sidenav-width'
const NAV_WIDTH_DEFAULT = 240

function readNavWidth() {
  try {
    const stored = Number(localStorage.getItem(NAV_WIDTH_KEY))
    return stored > 0 ? stored : NAV_WIDTH_DEFAULT
  } catch {
    return NAV_WIDTH_DEFAULT
  }
}

const CONTEXT_PARAM = 'context'

function readSelected() {
  const id = new URLSearchParams(window.location.search).get(CONTEXT_PARAM)
  return id ? findContext(id) : null
}

function writeSelected(file) {
  const url = new URL(window.location.href)
  if (file) url.searchParams.set(CONTEXT_PARAM, file.id)
  else url.searchParams.delete(CONTEXT_PARAM)
  if (url.href !== window.location.href) window.history.pushState(null, '', url)
}

function App() {
  const [navOpen, setNavOpen] = useState(false)
  const [navWidth, setNavWidth] = useState(readNavWidth)
  const [selected, setSelected] = useState(readSelected)
  const [loaded, setLoaded] = useState({ path: null, context: null, error: null })
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has(CONTEXT_PARAM) && !readSelected()) {
      url.searchParams.delete(CONTEXT_PARAM)
      window.history.replaceState(null, '', url)
    }
    const onPopState = () => setSelected(readSelected())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    loadContext(selected)
      .then((context) => !cancelled && setLoaded({ path: selected.path, context, error: null }))
      .catch((error) => !cancelled && setLoaded({ path: selected.path, context: null, error }))
    return () => {
      cancelled = true
    }
  }, [selected])

  useEffect(() => {
    try {
      localStorage.setItem(NAV_WIDTH_KEY, String(navWidth))
    } catch {
      return
    }
  }, [navWidth])

  const select = (file) => {
    setNavOpen(false)
    if (file?.path === selected?.path) {
      setRevision((r) => r + 1)
    } else {
      setSelected(file)
      writeSelected(file)
    }
  }

  const renderContent = () => {
    if (!selected) return <ContextTable key={`new:${revision}`} />
    if (loaded.path !== selected.path) return <p className="status">Loading {selected.name}…</p>
    if (loaded.error) {
      return (
        <p className="status error">
          Could not load {selected.name}: {loaded.error.message}
        </p>
      )
    }
    return (
      <ContextTable
        key={`${selected.path}:${revision}`}
        initialContext={loaded.context}
       
      />
    )
  }

  return (
    <div className="layout" style={{ '--sidenav-w': `${navWidth}px` }}>
      <TopBar onMenuClick={() => setNavOpen((open) => !open)} />
      <SideNav
        open={navOpen}
        selected={selected}
        onSelect={select}
        width={navWidth}
        onResize={setNavWidth}
      />
      {navOpen && <div className="backdrop" onClick={() => setNavOpen(false)} />}
      <main className="content">{renderContent()}</main>
    </div>
  )
}

export default App
