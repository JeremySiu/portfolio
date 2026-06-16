import { useEffect, useRef, useState } from 'react'

const LIT_URL = 'https://lost-in-translation-axl.vercel.app/'
export const LIT_HOST = 'lost-in-translation-axl.vercel.app'
const LIT_RELOAD_EVENT = 'lit:reload'
// If the embedded page hasn't reported a load within this window, assume the
// browser blocked framing and fall back to opening it in a real new tab
// (then close this app window, mirroring the GitHub/LinkedIn behaviour).
const LOAD_TIMEOUT_MS = 9000

export default function LostInTranslationApp({ onClose }: { onClose?: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (loaded) return
    const timer = window.setTimeout(() => {
      if (!iframeRef.current) return
      window.open(LIT_URL, '_blank', 'noopener,noreferrer')
      onClose?.()
    }, LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [loaded, onClose])

  // The reload control lives in the window's title bar (rendered by the parent),
  // so it asks us to refresh via a window event rather than a prop.
  useEffect(() => {
    const onReload = () => {
      setLoaded(false)
      setReloadKey((k) => k + 1)
    }
    window.addEventListener(LIT_RELOAD_EVENT, onReload)
    return () => window.removeEventListener(LIT_RELOAD_EVENT, onReload)
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <iframe
        key={reloadKey}
        ref={iframeRef}
        src={LIT_URL}
        title="Lost in Translation"
        onLoad={() => setLoaded(true)}
        allow="clipboard-write; encrypted-media; fullscreen"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />

      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            background: '#ffffff',
            color: '#475569',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '3px solid #fde9b8',
              borderTopColor: '#f59e0b',
              animation: 'lit-spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Loading Lost in Translation…</span>
          <style>{`@keyframes lit-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  )
}

/**
 * Safari-style controls (back / forward / address field / reload) rendered
 * inside a window's title bar in place of the app title.
 *
 * Back & forward are decorative/disabled: the embedded site is cross-origin, so
 * the browser blocks programmatic access to its navigation history. Reload is
 * functional and re-mounts the iframe via a window event.
 */
export function SafariToolbar({
  tone = 'onLight',
  showReload = true,
}: {
  tone?: 'onLight' | 'onDark'
  showReload?: boolean
}) {
  const onDark = tone === 'onDark'
  const textColor = onDark ? 'rgba(255,255,255,0.92)' : '#3c3c43'
  const dim = onDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,60,67,0.3)'

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <NavArrow direction="back" color={dim} />
      <NavArrow direction="forward" color={dim} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 26,
          padding: '0 12px',
          borderRadius: 7,
          background: onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.07)',
          color: textColor,
          overflow: 'hidden',
        }}
      >
        <LockIcon color={onDark ? 'rgba(255,255,255,0.8)' : '#8e8e93'} />
        <input
          readOnly
          value={LIT_URL}
          spellCheck={false}
          aria-label="Page URL"
          onPointerDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: textColor,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            textOverflow: 'ellipsis',
            cursor: 'text',
            padding: 0,
          }}
        />
      </div>

      {showReload && <SafariReloadButton tone={tone} />}
    </div>
  )
}

export function SafariReloadButton({ tone = 'onLight' }: { tone?: 'onLight' | 'onDark' }) {
  const fg = tone === 'onDark' ? 'rgba(255,255,255,0.92)' : '#1c1c1e'
  const reload = () => window.dispatchEvent(new Event(LIT_RELOAD_EVENT))
  return (
    <button
      type="button"
      aria-label="Reload page"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={reload}
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: fg,
        cursor: 'pointer',
      }}
    >
      <ReloadIcon />
    </button>
  )
}

function NavArrow({ direction, color }: { direction: 'back' | 'forward'; color: string }) {
  return (
    <div
      aria-hidden
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 26,
        color,
      }}
    >
      <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
        <path
          d={direction === 'back' ? 'M7.5 1L1.5 7.5l6 6.5' : 'M1.5 1l6 6.5-6 6.5'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function LockIcon({ color = '#8e8e93' }: { color?: string }) {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="5.5" width="9" height="7" rx="1.6" fill={color} />
      <path
        d="M3 5.5V4a2.5 2.5 0 0 1 5 0v1.5"
        stroke={color}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ReloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
      <path
        d="M14 8.5a5.5 5.5 0 1 1-1.7-3.97"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 2.2V5.2H11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
