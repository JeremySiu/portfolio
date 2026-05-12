import { useState, useEffect } from 'react'

interface MenuBarProps {
  activeApp: string | null
}

export default function MenuBar({ activeApp }: MenuBarProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatted = time.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{
        height: '28px',
        background: 'rgba(20, 10, 40, 0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-5">
        {/* Apple logo */}
        <span className="text-white text-base leading-none cursor-pointer hover:opacity-70 transition-opacity select-none">
          
        </span>

        {/* Active app name */}
        <span className="text-white font-semibold text-sm select-none">
          {activeApp ?? 'Finder'}
        </span>

        {['File', 'Edit', 'View', 'Window', 'Help'].map((item) => (
          <span
            key={item}
            className="text-white text-sm opacity-80 hover:opacity-100 cursor-default select-none transition-opacity"
          >
            {item}
          </span>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="text-white text-xs opacity-80 select-none">🔋 100%</span>
        <span className="text-white text-xs opacity-80 select-none">📶</span>
        <span className="text-white text-sm select-none font-medium">{formatted}</span>
      </div>
    </div>
  )
}
