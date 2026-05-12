import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion'

interface WindowProps {
  id: string
  title: string
  emoji: string
  isOpen: boolean
  isMinimized: boolean
  zIndex: number
  defaultPosition: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  originCenter?: { x: number; y: number }
  children: ReactNode
  onClose: () => void
  onMinimize: () => void
  onFocus: () => void
}

export default function Window({
  title,
  emoji,
  isOpen,
  isMinimized,
  zIndex,
  defaultPosition,
  defaultSize = { width: 700, height: 500 },
  originCenter,
  children,
  onClose,
  onMinimize,
  onFocus,
}: WindowProps) {
  const dragControls = useDragControls()
  const x = useMotionValue(defaultPosition.x)
  const y = useMotionValue(defaultPosition.y)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const visible = isOpen && !isMinimized

  // Compute CSS transform-origin so the bloom radiates from the clicked icon.
  // transformOrigin is relative to the window element's own top-left corner.
  const transformOrigin = originCenter
    ? `${originCenter.x - defaultPosition.x}px ${originCenter.y - defaultPosition.y}px`
    : 'center center'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          drag={!isFullscreen}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          style={{
            x: isFullscreen ? 0 : x,
            y: isFullscreen ? 0 : y,
            position: 'absolute',
            zIndex,
            width: isFullscreen ? '100%' : defaultSize.width,
            height: isFullscreen ? 'calc(100% - 28px)' : defaultSize.height,
            top: isFullscreen ? 28 : 0,
            left: isFullscreen ? 0 : undefined,
            borderRadius: isFullscreen ? 0 : 12,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            transformOrigin,
          }}
          initial={{ scale: 0.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.15, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          onPointerDown={onFocus}
        >
          {/* Title bar — drag handle */}
          <div
            className="window-titlebar flex items-center px-3 gap-2 shrink-0 select-none"
            style={{
              height: 44,
              background: 'rgba(40, 30, 60, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              cursor: isFullscreen ? 'default' : 'grab',
            }}
            onPointerDown={(e) => {
              if (!isFullscreen) dragControls.start(e)
            }}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-2 mr-2">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                className="w-3 h-3 rounded-full flex items-center justify-center group transition-all"
                style={{ background: '#FF5F57', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
                title="Close"
              >
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-red-900 leading-none font-bold">✕</span>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onMinimize}
                className="w-3 h-3 rounded-full flex items-center justify-center group transition-all"
                style={{ background: '#FEBC2E', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
                title="Minimize"
              >
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-yellow-900 leading-none font-bold">−</span>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setIsFullscreen((f) => !f)}
                className="w-3 h-3 rounded-full flex items-center justify-center group transition-all"
                style={{ background: '#28C840', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
                title="Fullscreen"
              >
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-green-900 leading-none font-bold">+</span>
              </button>
            </div>

            {/* Centered title */}
            <div className="absolute left-0 right-0 flex items-center justify-center gap-2 pointer-events-none">
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-white text-sm font-medium opacity-90">{title}</span>
            </div>
          </div>

          {/* Body */}
          <div
            className="window-body flex-1 overflow-auto"
            style={{
              background: 'rgba(18, 12, 35, 0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
