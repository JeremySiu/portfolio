import { useState, useCallback } from 'react'
import MenuBar from './components/MenuBar'
import Desktop, { type AppDefinition } from './components/Desktop'
import Dock from './components/Dock'
import Window from './components/Window'
import ProjectsApp from './components/apps/ProjectsApp'
import SkillsApp from './components/apps/SkillsApp'
import ExperienceApp from './components/apps/ExperienceApp'

const APPS: AppDefinition[] = [
  { id: 'projects', label: 'Projects', emoji: '⚡' },
  { id: 'skills', label: 'Skills', emoji: '🛠️' },
  { id: 'experience', label: 'Experience', emoji: '💼' },
]

interface WindowState {
  isOpen: boolean
  isMinimized: boolean
  zIndex: number
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  projects: { x: 140, y: 60 },
  skills: { x: 200, y: 80 },
  experience: { x: 260, y: 70 },
}

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  projects: { width: 720, height: 520 },
  skills: { width: 600, height: 480 },
  experience: { width: 640, height: 520 },
}

const WINDOW_CONTENT: Record<string, React.ReactNode> = {
  projects: <ProjectsApp />,
  skills: <SkillsApp />,
  experience: <ExperienceApp />,
}

function initWindowStates(): Record<string, WindowState> {
  const states: Record<string, WindowState> = {}
  APPS.forEach((app, i) => {
    states[app.id] = { isOpen: false, isMinimized: false, zIndex: i + 10 }
  })
  return states
}

let zCounter = 100

export default function App() {
  const [windowStates, setWindowStates] = useState<Record<string, WindowState>>(initWindowStates)
  const [originCenters, setOriginCenters] = useState<Record<string, { x: number; y: number }>>({})
  const [activeApp, setActiveApp] = useState<string | null>(null)

  const focusWindow = useCallback((id: string) => {
    zCounter += 1
    setWindowStates((prev) => ({ ...prev, [id]: { ...prev[id], zIndex: zCounter } }))
    setActiveApp(APPS.find((a) => a.id === id)?.label ?? null)
  }, [])

  const openApp = useCallback((id: string, center: { x: number; y: number }) => {
    zCounter += 1
    setOriginCenters((prev) => ({ ...prev, [id]: center }))
    setWindowStates((prev) => ({ ...prev, [id]: { isOpen: true, isMinimized: false, zIndex: zCounter } }))
    setActiveApp(APPS.find((a) => a.id === id)?.label ?? null)
  }, [])

  const closeApp = useCallback((id: string) => {
    setWindowStates((prev) => ({ ...prev, [id]: { ...prev[id], isOpen: false, isMinimized: false } }))
    setActiveApp(null)
  }, [])

  const minimizeApp = useCallback((id: string) => {
    setWindowStates((prev) => ({ ...prev, [id]: { ...prev[id], isMinimized: true } }))
    setActiveApp(null)
  }, [])

  const activateFromDock = useCallback((id: string, center: { x: number; y: number }) => {
    const state = windowStates[id]
    if (!state) return

    if (!state.isOpen) {
      openApp(id, center)
    } else if (state.isMinimized) {
      zCounter += 1
      setOriginCenters((prev) => ({ ...prev, [id]: center }))
      setWindowStates((prev) => ({ ...prev, [id]: { ...prev[id], isMinimized: false, zIndex: zCounter } }))
      setActiveApp(APPS.find((a) => a.id === id)?.label ?? null)
    } else {
      focusWindow(id)
    }
  }, [windowStates, openApp, focusWindow])

  const openWindowIds = APPS
    .filter((a) => windowStates[a.id]?.isOpen && !windowStates[a.id]?.isMinimized)
    .map((a) => a.id)

  return (
    <div
      className="wallpaper w-full h-full relative overflow-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
    >
      <MenuBar activeApp={activeApp} />

      <Desktop
        apps={APPS}
        openWindowIds={openWindowIds}
        onOpenApp={openApp}
      />

      {APPS.map((app) => (
        <Window
          key={app.id}
          id={app.id}
          title={app.label}
          emoji={app.emoji}
          isOpen={windowStates[app.id].isOpen}
          isMinimized={windowStates[app.id].isMinimized}
          zIndex={windowStates[app.id].zIndex}
          defaultPosition={DEFAULT_POSITIONS[app.id]}
          defaultSize={DEFAULT_SIZES[app.id]}
          originCenter={originCenters[app.id]}
          onClose={() => closeApp(app.id)}
          onMinimize={() => minimizeApp(app.id)}
          onFocus={() => focusWindow(app.id)}
        >
          {WINDOW_CONTENT[app.id]}
        </Window>
      ))}

      <Dock
        apps={APPS}
        windowStates={windowStates}
        onActivate={activateFromDock}
      />
    </div>
  )
}
