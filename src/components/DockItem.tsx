import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface DockItemProps {
  id: string
  label: string
  emoji: string
  isOpen: boolean
  isMinimized: boolean
  mouseX: ReturnType<typeof useMotionValue<number>>
  onClick: (center: { x: number; y: number }) => void
}

const ICON_SIZE = 56
const MAGNIFIED_SIZE = 80
const DOCK_MARGIN = 100

export default function DockItem({ label, emoji, isOpen, isMinimized, mouseX, onClick }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - (bounds.x + bounds.width / 2)
  })

  const widthSync = useTransform(distance, [-DOCK_MARGIN, 0, DOCK_MARGIN], [ICON_SIZE, MAGNIFIED_SIZE, ICON_SIZE])
  const width = useSpring(widthSync, { stiffness: 300, damping: 22 })

  const ySync = useTransform(distance, [-DOCK_MARGIN, 0, DOCK_MARGIN], [0, -10, 0])
  const y = useSpring(ySync, { stiffness: 300, damping: 22 })

  const handleClick = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      onClick({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
  }

  return (
    <div className="flex flex-col items-center gap-1" ref={ref}>
      <motion.div
        style={{ width, height: width, y }}
        className="relative flex items-center justify-center rounded-2xl text-3xl cursor-pointer"
        onClick={handleClick}
        whileTap={{ scale: 0.9 }}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
          }}
        />
        <span className="relative z-10">{emoji}</span>

        {isMinimized && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 z-20"
            style={{ background: '#FEBC2E' }}
          />
        )}
      </motion.div>

      {/* Dot indicator */}
      {isOpen && !isMinimized && <div className="w-1.5 h-1.5 rounded-full bg-white/80" />}
      {isMinimized && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/80" />}
      {!isOpen && !isMinimized && <div className="w-1.5 h-1.5" />}

      {/* Tooltip */}
      <span
        className="absolute -top-8 text-white text-xs px-2 py-1 rounded-md pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        {label}
      </span>
    </div>
  )
}
