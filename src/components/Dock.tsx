import { useMotionValue } from 'framer-motion'
import DockItem from './DockItem'
import type { AppDefinition } from './Desktop'

interface WindowState {
  isOpen: boolean
  isMinimized: boolean
}

interface DockProps {
  apps: AppDefinition[]
  windowStates: Record<string, WindowState>
  onActivate: (id: string, center: { x: number; y: number }) => void
}

export default function Dock({ apps, windowStates, onActivate }: DockProps) {
  const mouseX = useMotionValue(Infinity)

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div
        className="flex items-end gap-2 px-3 pb-3 pt-2 pointer-events-auto relative"
        style={{
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(30px) saturate(200%)',
          WebkitBackdropFilter: 'blur(30px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {/* Finder — decorative */}
        <DockItem
          id="finder"
          label="Finder"
          emoji="🗂️"
          isOpen={false}
          isMinimized={false}
          mouseX={mouseX}
          onClick={() => {}}
        />

        <div
          className="w-px self-stretch mx-1"
          style={{ background: 'rgba(255,255,255,0.2)', marginBottom: 4 }}
        />

        {apps.map((app) => (
          <DockItem
            key={app.id}
            id={app.id}
            label={app.label}
            emoji={app.emoji}
            isOpen={windowStates[app.id]?.isOpen ?? false}
            isMinimized={windowStates[app.id]?.isMinimized ?? false}
            mouseX={mouseX}
            onClick={(center) => onActivate(app.id, center)}
          />
        ))}

        <div
          className="w-px self-stretch mx-1"
          style={{ background: 'rgba(255,255,255,0.2)', marginBottom: 4 }}
        />

        {/* Trash — decorative */}
        <DockItem
          id="trash"
          label="Trash"
          emoji="🗑️"
          isOpen={false}
          isMinimized={false}
          mouseX={mouseX}
          onClick={() => {}}
        />
      </div>
    </div>
  )
}
