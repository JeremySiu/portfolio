import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface DesktopIconProps {
  id: string
  label: string
  emoji: string
  isOpen: boolean
  onOpen: (center: { x: number; y: number }) => void
}

export default function DesktopIcon({ label, emoji, isOpen, onOpen }: DesktopIconProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(false)

  const handleDoubleClick = () => {
    setSelected(true)
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      onOpen({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    setTimeout(() => setSelected(false), 300)
  }

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center gap-1 cursor-pointer select-none w-20"
      onDoubleClick={handleDoubleClick}
      onClick={() => setSelected(true)}
      whileTap={{ scale: 0.92 }}
    >
      {/* Icon */}
      <div
        className="relative w-16 h-16 flex items-center justify-center rounded-2xl text-4xl transition-all duration-150"
        style={{
          background: selected ? 'rgba(100,160,255,0.35)' : 'rgba(255,255,255,0.08)',
          boxShadow: isOpen
            ? '0 0 0 2px rgba(100,160,255,0.6), 0 4px 16px rgba(0,0,0,0.3)'
            : '0 4px 16px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {emoji}
        {isOpen && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </div>

      {/* Label */}
      <span
        className="text-white text-xs text-center leading-tight px-1.5 py-0.5 rounded"
        style={{
          background: selected ? 'rgba(0, 120, 215, 0.75)' : 'transparent',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          maxWidth: '80px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </motion.div>
  )
}
