import DesktopIcon from './DesktopIcon'

export interface AppDefinition {
  id: string
  label: string
  emoji: string
}

interface DesktopProps {
  apps: AppDefinition[]
  openWindowIds: string[]
  onOpenApp: (id: string, center: { x: number; y: number }) => void
}

export default function Desktop({ apps, openWindowIds, onOpenApp }: DesktopProps) {
  return (
    <div className="absolute inset-0 pt-16 pb-24 pl-5">
      <div className="flex flex-col gap-5 pt-3 items-start">
        {apps.map((app) => (
          <DesktopIcon
            key={app.id}
            id={app.id}
            label={app.label}
            emoji={app.emoji}
            isOpen={openWindowIds.includes(app.id)}
            onOpen={(center) => onOpenApp(app.id, center)}
          />
        ))}
      </div>
    </div>
  )
}
