import { useState, useEffect, useLayoutEffect, useRef, useCallback, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProjectsApp from './apps/ProjectsApp'
import SkillsApp from './apps/SkillsApp'
import ExperienceApp from './apps/ExperienceApp'
import {
  MOBILE_FRIENDS_GALLERY,
  MOBILE_FRIENDS_ROTATE_INTERVAL_SEC,
  MOBILE_MUSIC_ROTATE_INTERVAL_SEC,
  MOBILE_PLAYLIST,
} from '../data/mobileHomeMedia'
import { AppSurfaceContext } from '../context/AppSurfaceContext'

// ─── Contact info ───────────────────────────────────────────────────────────

const PHONE_NUMBER = '647 918 2181'
const PHONE_NUMBER_TEL = '+16479182181'
const EMAIL = 'jeremy.siu@gmail.com'

const CHESS_WEB_URL = 'https://www.chess.com/play/online'
const CLASH_ROYALE_WEB_URL = 'https://supercell.com/en/games/clashroyale/'
const LINKEDIN_URL = 'https://www.linkedin.com/in/jeremy-siu/'
const GITHUB_PROFILE_URL = 'https://github.com/JeremySiu'

/** These apps only open a new browser tab (no in-portfolio window). */
const APP_OPEN_IN_NEW_TAB: Record<string, string> = {
  github: GITHUB_PROFILE_URL,
  linkedin: LINKEDIN_URL,
}

function appOpensInPortfolio(appId: string): boolean {
  return !APP_OPEN_IN_NEW_TAB[appId]
}

/** Viewports wider than this use floating macOS-style windows instead of full-screen app sheets. */
const DESKTOP_MAC_WINDOW_MIN_WIDTH_PX = 1024

// ─── App registry ───────────────────────────────────────────────────────────

interface AppDef {
  id: string
  label: string
  Icon: (props: { size?: number }) => React.ReactNode
  background: string
}

/** App icon assets in `public/icons/` (served as `/icons/...`). */
const RASTER_APP_ICONS = {
  projects: '/icons/files.svg',
  skills: '/icons/skills.webp',
  experience: '/icons/experiences.png',
  github: '/icons/github.webp',
  chess: '/icons/chess.png',
  clash: '/icons/clash.png',
  linkedin: '/icons/linkedIn.png',
  phone: '/icons/phone.png',
  email: '/icons/mail.png',
} as const

type RasterIconOptions = {
  /** Scale factor > 1 zooms the graphic so it fully covers the tile (clips gradient underflow at corners). */
  coverZoom?: number
}

function rasterAppIcon(src: string, options?: RasterIconOptions) {
  const coverZoom = options?.coverZoom ?? 1
  return function RasterAppIcon(_props: { size?: number }) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: coverZoom !== 1 ? `scale(${coverZoom})` : undefined,
        }}
      />
    )
  }
}

const APPS: AppDef[] = [
  {
    id: 'projects',
    label: 'Projects',
    Icon: rasterAppIcon(RASTER_APP_ICONS.projects),
    background: 'linear-gradient(160deg, #fbbf24 0%, #f97316 60%, #ef4444 100%)',
  },
  {
    id: 'skills',
    label: 'Skills',
    Icon: rasterAppIcon(RASTER_APP_ICONS.skills),
    background: 'linear-gradient(160deg, #60a5fa 0%, #6366f1 55%, #8b5cf6 100%)',
  },
  {
    id: 'experience',
    label: 'Experience',
    Icon: rasterAppIcon(RASTER_APP_ICONS.experience),
    background: 'linear-gradient(160deg, #c084fc 0%, #a855f7 55%, #7c3aed 100%)',
  },
  {
    id: 'github',
    label: 'GitHub',
    Icon: rasterAppIcon(RASTER_APP_ICONS.github, { coverZoom: 1.42 }),
    background: '#181818',
  },
  {
    id: 'chess',
    label: 'Chess',
    Icon: rasterAppIcon(RASTER_APP_ICONS.chess),
    background: 'linear-gradient(160deg, #e8cfa3 0%, #b0894a 45%, #4a3728 100%)',
  },
  {
    id: 'clash',
    label: 'Clash',
    Icon: rasterAppIcon(RASTER_APP_ICONS.clash),
    background: 'linear-gradient(160deg, #7dd3fc 0%, #0284c7 52%, #0c4a6e 100%)',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    Icon: rasterAppIcon(RASTER_APP_ICONS.linkedin),
    background: 'linear-gradient(160deg, #93c5fd 0%, #2563eb 50%, #0a66c2 100%)',
  },
  {
    id: 'phone',
    label: 'Phone',
    Icon: rasterAppIcon(RASTER_APP_ICONS.phone),
    background: 'linear-gradient(180deg, #2bd667 0%, #21b85a 100%)',
  },
  {
    id: 'email',
    label: 'Mail',
    Icon: rasterAppIcon(RASTER_APP_ICONS.email),
    background: 'linear-gradient(180deg, #6ec3ff 0%, #1f8bff 100%)',
  },
]

const DOCK_IDS = ['phone', 'email', 'github', 'projects']

/** Apps tracked in iPad homework-style checklist widget (opening the app ticks the row). Resets on full page reload. */
const IPAD_VISIT_CHECKLIST_IDS = ['projects', 'skills', 'experience', 'email'] as const

const IPAD_VISIT_CHECKLIST_ITEMS: { id: string; label: string }[] = IPAD_VISIT_CHECKLIST_IDS.map((id) => ({
  id,
  label: APPS.find((a) => a.id === id)!.label,
}))

function normalizeIpadVisitChecklist(parsed: unknown): Record<string, boolean> {
  const base: Record<string, boolean> = {}
  for (const id of IPAD_VISIT_CHECKLIST_IDS) base[id] = false
  if (!parsed || typeof parsed !== 'object') return base
  for (const id of IPAD_VISIT_CHECKLIST_IDS) {
    const v = (parsed as Record<string, unknown>)[id]
    if (typeof v === 'boolean') base[id] = v
  }
  return base
}

// ─── Inline app screens ─────────────────────────────────────────────────────

function PhoneApp() {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'
  const titleColor = L ? '#18181b' : 'white'
  const subColor = L ? 'rgba(24,24,27,0.55)' : 'rgba(255,255,255,0.5)'
  const cardBg = L ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.07)'
  const cardBorder = L ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)'
  const labelMuted = L ? 'rgba(24,24,27,0.45)' : 'rgba(255,255,255,0.45)'
  const numberColor = L ? '#18181b' : 'white'
  const footColor = L ? 'rgba(24,24,27,0.5)' : 'rgba(255,255,255,0.4)'

  return (
    <div
      style={{
        padding: '24px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          paddingTop: 32,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #2bd667 0%, #1aa84a 100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <img
            src={RASTER_APP_ICONS.phone}
            alt=""
            width={48}
            height={48}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: titleColor, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Jeremy Siu
          </h2>
          <p style={{ color: subColor, fontSize: 14, marginTop: 4 }}>mobile</p>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: cardBg,
          border: cardBorder,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              color: labelMuted,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Phone
          </span>
          <span style={{ color: numberColor, fontSize: 18, fontWeight: 500, marginTop: 2 }}>
            {PHONE_NUMBER}
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigator.clipboard?.writeText(PHONE_NUMBER).catch(() => {})}
          style={{ color: '#34c759', fontSize: 14, fontWeight: 500 }}
        >
          Copy
        </motion.button>
      </div>

      <motion.a
        href={`tel:${PHONE_NUMBER_TEL}`}
        whileTap={{ scale: 0.96 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '16px',
          borderRadius: 16,
          color: 'white',
          fontWeight: 600,
          fontSize: 16,
          background: 'linear-gradient(180deg, #2bd667 0%, #1aa84a 100%)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M5.5 4.5C5.5 3.95 5.95 3.5 6.5 3.5h2.4c.48 0 .89.34.98.81l.7 3.5a1 1 0 0 1-.27.92L8.6 10.44a13 13 0 0 0 5 5l1.71-1.71a1 1 0 0 1 .92-.27l3.5.7c.47.09.81.5.81.98v2.4c0 .55-.45 1-1 1A14.5 14.5 0 0 1 5.5 4.5Z" />
        </svg>
        Call {PHONE_NUMBER}
      </motion.a>

      <p
        style={{
          color: footColor,
          fontSize: 12,
          textAlign: 'center',
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        Tap the green button above to dial directly from your phone, or copy the number to your
        clipboard.
      </p>
    </div>
  )
}

function EmailApp() {
  const [subject, setSubject] = useState('Hello Jeremy')
  const [body, setBody] = useState(
    'Hi Jeremy,\n\nI came across your portfolio and wanted to reach out.\n\n',
  )
  const [copied, setCopied] = useState(false)
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'

  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`

  const mailtoAnchorRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = mailtoAnchorRef.current
    if (!el) return

    const openMailCompose = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (e.button !== 0) return
      // Native capture handler: survives React delegation + avoids cases where SPA / motion
      // ancestry prevents `<a>` activation even though pasted mailto URLs work.
      e.preventDefault()
      e.stopPropagation()
      window.location.assign(mailto)
    }

    el.addEventListener('click', openMailCompose, true)
    return () => el.removeEventListener('click', openMailCompose, true)
  }, [mailto])

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '14px 16px',
    borderBottom: L ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
    gap: 12,
  }

  const labelStyle: React.CSSProperties = {
    color: L ? 'rgba(24,24,27,0.55)' : 'rgba(255,255,255,0.5)',
    fontSize: 14,
    width: 60,
    flexShrink: 0,
    paddingTop: 2,
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: L ? '#18181b' : 'white',
    fontSize: 14,
    fontFamily: 'inherit',
    padding: 0,
  }

  const titleColor = L ? '#18181b' : 'white'
  const subColor = L ? 'rgba(24,24,27,0.55)' : 'rgba(255,255,255,0.5)'
  const formShell = L
    ? { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)' }
    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }
  const emailDisplayColor = L ? '#1d4ed8' : 'rgba(255,255,255,0.9)'

  return (
    <div
      style={{
        padding: '20px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          paddingTop: 16,
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 22,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #6ec3ff 0%, #1f8bff 100%)',
            boxShadow: '0 10px 30px rgba(31,139,255,0.35)',
          }}
        >
          <img
            src={RASTER_APP_ICONS.email}
            alt=""
            width={48}
            height={48}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: titleColor, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            New Message
          </h2>
          <p style={{ color: subColor, fontSize: 13, marginTop: 4 }}>Compose an email to Jeremy</p>
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          ...formShell,
        }}
      >
        <div style={rowStyle}>
          <span style={labelStyle}>To:</span>
          <span style={{ ...inputStyle, color: emailDisplayColor }}>{EMAIL}</span>
        </div>

        <div style={rowStyle}>
          <label htmlFor="email-subject" style={labelStyle}>
            Subject:
          </label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            style={inputStyle}
          />
        </div>

        <div style={{ padding: '14px 16px' }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: L ? '#18181b' : 'white',
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 140,
            }}
          />
        </div>
      </div>

      <a
        ref={mailtoAnchorRef}
        href={mailto}
        aria-label={`Open mail app to email ${EMAIL}`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '16px',
          borderRadius: 16,
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          fontWeight: 600,
          fontSize: 16,
          fontFamily: 'inherit',
          background: 'linear-gradient(180deg, #6ec3ff 0%, #1f8bff 100%)',
          textDecoration: 'none',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
          <path d="M2 4l10 8 10-8H2zM2 6v14h20V6l-10 8L2 6z" />
        </svg>
        Send Email
      </a>

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          navigator.clipboard
            ?.writeText(EMAIL)
            .then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
            .catch(() => {})
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px',
          borderRadius: 16,
          color: L ? '#3f3f46' : 'rgba(255,255,255,0.8)',
          fontWeight: 500,
          fontSize: 14,
          background: L ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
          border: L ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {copied ? 'Copied!' : 'Copy email address'}
      </motion.button>
    </div>
  )
}

function ChessApp() {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'
  const titleColor = L ? '#18181b' : 'white'
  const subColor = L ? 'rgba(24,24,27,0.65)' : 'rgba(255,255,255,0.5)'

  return (
    <div
      style={{
        padding: '24px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 12 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 26,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, #e8cfa3 0%, #8b6914 50%, #3d2914 100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <img
            src={RASTER_APP_ICONS.chess}
            alt=""
            width={56}
            height={56}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <h2 style={{ color: titleColor, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>Chess</h2>
        <p
          style={{
            color: subColor,
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 1.6,
            maxWidth: 280,
          }}
        >
          Jump into live games online when you&apos;re taking a break from shipping code.
        </p>
      </div>
      <motion.a
        href={CHESS_WEB_URL}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '16px',
          borderRadius: 16,
          color: 'white',
          fontWeight: 600,
          fontSize: 16,
          background: 'linear-gradient(135deg, #a67c52, #5c4033)',
        }}
      >
        Play on Chess.com ↗
      </motion.a>
    </div>
  )
}

function ClashRoyaleApp() {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'
  const titleColor = L ? '#18181b' : 'white'
  const subColor = L ? 'rgba(24,24,27,0.65)' : 'rgba(255,255,255,0.5)'

  return (
    <div
      style={{
        padding: '24px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 12 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 26,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, #7dd3fc 0%, #0284c7 52%, #0c4a6e 100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <img
            src={RASTER_APP_ICONS.clash}
            alt=""
            width={56}
            height={56}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <h2 style={{ color: titleColor, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Clash Royale
        </h2>
        <p
          style={{
            color: subColor,
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 1.6,
            maxWidth: 280,
          }}
        >
          Quick matches, decks, and the official game hub from Supercell — elixir refill not included.
        </p>
      </div>
      <motion.a
        href={CLASH_ROYALE_WEB_URL}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '16px',
          borderRadius: 16,
          color: 'white',
          fontWeight: 600,
          fontSize: 16,
          background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
        }}
      >
        Open Supercell hub ↗
      </motion.a>
    </div>
  )
}

// ─── Responsive size presets ────────────────────────────────────────────────

/**
 * Layout mode by viewport width:
 *   • 'phone' — <768px : 4-column home grid (2×2 apps, Friends tile), optional welcome note,
 *                then music bar full width.
 *   • 'ipad'  — ≥768px : flex row; Friends + Music stay in a dedicated right-hand column
 *                with a hard minimum width, while apps flex-wrap left so each icon wraps
 *                downward one-by-one as space tightens until the viewport hits 'phone'.
 */
type UIScale = 'phone' | 'ipad'

/**
 * Dedicated widget column — widen slightly so the condensed music row feels “horizontal”.
 */
const TABLET_WIDGET_STRIP_CLAMP = 'clamp(292px, 26vw, 352px)' as const

/** Approximate gutters between tablet home tiles (~1.3× icon size → reference-style air). */
const TABLET_TILE_GUTTER_PX = 84

interface UISizeSet {
  statusBarHeight: number
  statusBarPadding: string
  statusFontSize: number
  statusGap: number
  showNotch: boolean
  notchWidth: number
  notchHeight: number
  homeBodyPadding: string
  /** Phone-only — CSS grid. */
  gridCols?: number
  cellWidth?: number | null
  gridColGap?: number
  gridRowGap?: number
  tileHeight?: number
  friendsArea?: string
  /** Tablet-only — gap between wrapping app icons and widget strip */
  ipadAppsToWidgetsGap?: number
  /** Tablet-only — vertical gap between Friends and Music */
  ipadWidgetStackGap?: number
  /** Tablet-only — row/column gaps between wrapping app icons */
  ipadAppWrapGap?: number
  appIconSize: number
  appIconRadius: number
  appIconSvgSize: number
  appIconLabelGap: number
  appLabelFontSize: number
  dockOuterPadding: string
  dockInnerPadding: string
  dockGap: number
  dockIconSize: number
  dockIconRadius: number
  dockRadius: number
  pageDotsMarginBottom: number
  widgetRadius: number
  /** When set, caps the music widget content width and centers it inside its grid span. */
  musicMaxWidth: number | null
}

const SIZES: Record<UIScale, UISizeSet> = {
  phone: {
    statusBarHeight: 54,
    statusBarPadding: '14px 28px 0',
    statusFontSize: 17,
    statusGap: 6,
    showNotch: true,
    notchWidth: 124,
    notchHeight: 32,
    homeBodyPadding: '20px 22px 4px',
    gridCols: 4,
    cellWidth: null,
    gridColGap: 14,
    gridRowGap: 18,
    tileHeight: 76,
    friendsArea: '1 / 3 / 3 / 5',
    appIconSize: 60,
    appIconRadius: 15,
    appIconSvgSize: 34,
    appIconLabelGap: 6,
    appLabelFontSize: 12,
    dockOuterPadding: '15px 16px 15px',
    dockInnerPadding: '12px 16px 14px',
    dockGap: 14,
    dockIconSize: 56,
    dockIconRadius: 14,
    dockRadius: 26,
    pageDotsMarginBottom: 14,
    widgetRadius: 18,
    musicMaxWidth: null,
  },
  ipad: {
    statusBarHeight: 44,
    statusBarPadding: '14px 32px 0',
    statusFontSize: 16,
    statusGap: 8,
    showNotch: false,
    notchWidth: 0,
    notchHeight: 0,
    homeBodyPadding: '32px 48px 12px',
    /** Same gutter as between app icons → even rhythm into the widgets. */
    ipadAppsToWidgetsGap: TABLET_TILE_GUTTER_PX,
    ipadWidgetStackGap: 24,
    ipadAppWrapGap: TABLET_TILE_GUTTER_PX,
    appIconSize: 64,
    appIconRadius: 15,
    appIconSvgSize: 38,
    appIconLabelGap: 6,
    appLabelFontSize: 12,
    dockOuterPadding: '10px 0 10px',
    dockInnerPadding: '11px 18px 14px',
    dockGap: 18,
    dockIconSize: 58,
    dockIconRadius: 14,
    dockRadius: 24,
    pageDotsMarginBottom: 6,
    widgetRadius: 20,
    musicMaxWidth: null,
  },
}

/** Music bar shell height (two tile-height rows + one row gap — matches prior in-grid sizing). */
const TABLET_MUSIC_BAR_HEIGHT_PX =
  (SIZES.phone.tileHeight ?? 76) * 2 + (SIZES.phone.gridRowGap ?? 14)

/**
 * Welcome note widget on phone — only rendered when the scroll viewport (scrollTop 0) has at
 * least this much vertical space below the app grid to fit the note stack (note + row + music).
 */
const PHONE_WELCOME_NOTE_MIN_SPACE_BELOW_GRID_PX =
  232 +
  (SIZES.phone.gridRowGap ?? 14) +
  TABLET_MUSIC_BAR_HEIGHT_PX

/** Gallery strip width — note widget matches this on tablet for parity with Friends widget. */
const WELCOME_NOTE_TABLET_SHELL_STYLE: React.CSSProperties = {
  width: TABLET_WIDGET_STRIP_CLAMP,
  /** Slightly shorter than Friends height range so it reads closer to square. */
  height: 'clamp(248px, 28vh, 304px)',
  flexShrink: 0,
}

/** Gap between stacked welcome note & checklist on iPad — tighter than tile gutter for readability. */
const TABLET_NOTE_TO_CHECKLIST_GAP_PX = 14

/** Explores checklist: fills remaining left-column height above the dock (iPad/desktop). */
const IPAD_HOME_CHECKLIST_SHELL_STYLE: React.CSSProperties = {
  width: TABLET_WIDGET_STRIP_CLAMP,
  flex: '1 1 0',
  minHeight: 0,
  alignSelf: 'stretch',
}

const WELCOME_NOTE_PHONE_SHELL_STYLE: React.CSSProperties = {
  width: '100%',
  /** Sized to fit the viewport slack check between the app grid and the music widget. */
  height: 'clamp(200px, 38vmin, 248px)',
  flexShrink: 0,
}

function pickUIScale(w: number): UIScale {
  if (w < 768) return 'phone'
  return 'ipad'
}

/** Layout snapshot: iOS-style scale plus viewport + wide-desktop window mode. */
interface UILayout {
  scale: UIScale
  viewportW: number
  viewportH: number
  /** Large-enough browser width for floating macOS-style windows (not phone / narrow tablet). */
  desktopMacWindows: boolean
}

function useUILayout(): UILayout {
  const read = (): UILayout => {
    if (typeof window === 'undefined') {
      return {
        scale: 'phone',
        viewportW: 1024,
        viewportH: 768,
        desktopMacWindows: false,
      }
    }
    const w = window.innerWidth
    const h = window.innerHeight
    return {
      scale: pickUIScale(w),
      viewportW: w,
      viewportH: h,
      desktopMacWindows: w >= DESKTOP_MAC_WINDOW_MIN_WIDTH_PX,
    }
  }
  const [layout, setLayout] = useState<UILayout>(read)
  useEffect(() => {
    const handler = () => setLayout(read())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return layout
}

function FriendsPhotoWidget({
  widgetRadius,
  wrapperStyle,
}: {
  widgetRadius: number
  wrapperStyle?: React.CSSProperties
}) {
  const slides = MOBILE_FRIENDS_GALLERY
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const scrollTo = (i: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    if (slides.length <= 1) return
    const id = window.setInterval(() => {
      setActive((i) => {
        const next = (i + 1) % slides.length
        scrollTo(next)
        return next
      })
    }, MOBILE_FRIENDS_ROTATE_INTERVAL_SEC * 1000)
    return () => clearInterval(id)
  }, [slides.length])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setActive(Math.max(0, Math.min(slides.length - 1, i)))
  }

  const jumpTo = (i: number) => {
    if (!slides.length) return
    const next = ((i % slides.length) + slides.length) % slides.length
    setActive(next)
    scrollTo(next)
  }

  if (!slides.length) return null

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: widgetRadius,
        overflow: 'hidden',
        ...wrapperStyle,
      }}
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="widget-strip-scroll"
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            style={{
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
          >
            <img
              src={slide.src}
              alt={slide.alt ?? ''}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            padding: '4px 0',
          }}
        >
          {slides.map((_, i) => (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.8 }}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              onClick={() => jumpTo(i)}
              style={{
                width: i === active ? 9 : 7,
                height: i === active ? 9 : 7,
                borderRadius: 999,
                background: 'white',
                opacity: i === active ? 1 : 0.55,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'width 0.2s ease, height 0.2s ease, opacity 0.2s ease',
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MusicHomeWidget({
  widgetRadius,
  maxWidth,
  wrapperStyle,
  tabletBar,
}: {
  widgetRadius: number
  maxWidth: number | null
  wrapperStyle?: React.CSSProperties
  /** Compact single-row strip for tablet widget column — short and wide-feeling vs tall album tile. */
  tabletBar?: boolean
}) {
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!MOBILE_PLAYLIST.length) return
    const a = audioRef.current
    if (!a) return
    a.src = MOBILE_PLAYLIST[index].audioUrl
    a.load()
    if (isPlaying) void a.play().catch(() => setIsPlaying(false))
    else a.pause()
  }, [index, isPlaying])

  useEffect(() => {
    if (!MOBILE_PLAYLIST.length || isPlaying) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MOBILE_PLAYLIST.length)
    }, MOBILE_MUSIC_ROTATE_INTERVAL_SEC * 1000)
    return () => clearInterval(id)
  }, [isPlaying])

  const go = (delta: number) => {
    setIndex((i) => (i + delta + MOBILE_PLAYLIST.length) % MOBILE_PLAYLIST.length)
  }

  const musicOuterStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: maxWidth ?? undefined,
    borderRadius: widgetRadius,
    overflow: 'hidden',
    ...wrapperStyle,
  }

  if (!MOBILE_PLAYLIST.length) {
    return (
      <div
        style={{
          ...musicOuterStyle,
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: 'rgba(255,255,255,0.78)',
          fontSize: 13,
          lineHeight: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        Add songs in <code style={{ fontSize: 12 }}>src/data/mobileHomeMedia.ts</code>.
      </div>
    )
  }

  const track = MOBILE_PLAYLIST[index]

  const ctrlBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: tabletBar ? 3 : 4,
    cursor: 'pointer',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={musicOuterStyle}>
      <audio
        ref={audioRef}
        controls={false}
        onEnded={() => setIndex((i) => (i + 1) % MOBILE_PLAYLIST.length)}
        style={{ display: 'none' }}
      />

      <div
        style={{
          flex:
            tabletBar !== true
              ? undefined
              : '0 0 150px',
          width:
            tabletBar ? 150 : undefined,
          aspectRatio: tabletBar !== true ? '1 / 1' : undefined,
          height: '100%',
          flexShrink: 0,
          background: '#111',
        }}
      >
        <img
          src={track.coverUrl}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          background: 'linear-gradient(180deg, #4a362c 0%, #3d2a22 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding:
            tabletBar === true
              ? '10px 12px 10px 8px'
              : '12px 16px',
          minWidth: 0,
          justifyContent:
            tabletBar === true ? 'space-between' : undefined,
        }}
      >
        <svg
          width={tabletBar ? 17 : 18}
          height={tabletBar ? 17 : 18}
          viewBox="0 0 24 24"
          fill="white"
          fillOpacity="0.9"
          style={
            tabletBar === true ? { position: 'absolute', top: 6, right: 6 } : { position: 'absolute', top: 10, right: 12 }
          }
        >
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>

        <div
          style={{
            flex:
              tabletBar === true ? '0 1 auto' : 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: tabletBar === true ? 'flex-start' : 'center',
            paddingRight:
              tabletBar === true ? 20 : 22,
            paddingTop:
              tabletBar === true ? 8 : 6,
            minHeight: 0,
          }}
        >
          <div
            style={{
              color: 'white',
              fontWeight: 700,
              fontSize:
                13,
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp:
                2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {track.title}
          </div>
          <div
            style={{
              marginTop:
                3,
              color: 'rgba(255,255,255,0.8)',
              fontSize:
                12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {track.artist}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap:
              tabletBar === true ? 18 : 24,
            paddingTop:
              tabletBar === true ? 0 : 2,
            flexShrink: 0,
          }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            aria-label="Previous track"
            onClick={() => go(-1)}
            style={ctrlBtnStyle}
          >
            <svg width={tabletBar === true ? 18 : 20} height={tabletBar === true ? 18 : 20} viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" />
            </svg>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setIsPlaying((p) => !p)}
            style={ctrlBtnStyle}
          >
            {isPlaying ? (
              <svg width={tabletBar === true ? 22 : 24} height={tabletBar === true ? 22 : 24} viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
              </svg>
            ) : (
              <svg width={tabletBar === true ? 24 : 26} height={tabletBar === true ? 24 : 26} viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            aria-label="Next track"
            onClick={() => go(1)}
            style={ctrlBtnStyle}
          >
            <svg width={tabletBar === true ? 18 : 20} height={tabletBar === true ? 18 : 20} viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2v12zM6 6v12l8.5-6L6 6z" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

const PORTFOLIO_WELCOME_BODY_COPY =
  "Hi, I'm Jeremy! Welcome to my portfolio. Navigate through the different apps to learn more about me :)"

/** iPad-style “note” tile: golden header strip, dotted rule, parchment body (see home-screen reference). */
function PortfolioNoteWidget({
  widgetRadius,
  shellStyle,
  bodyFontSize,
  dense,
}: {
  widgetRadius: number
  shellStyle: React.CSSProperties
  /** Slightly smaller type and padding when space-checked on phone. */
  bodyFontSize: number
  dense?: boolean
}) {
  return (
    <div
      aria-label="Welcome note"
      style={{
        position: 'relative',
        borderRadius: widgetRadius,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8f8f6',
        ...shellStyle,
      }}
    >
      <div
        style={{
          flex: '0 0 22%',
          minHeight: 0,
          maxHeight: dense === true ? 48 : 52,
          boxSizing: 'border-box',
          background: '#fbbf24',
          padding: dense === true ? '7px 12px' : '8px 13px',
          borderTopLeftRadius: widgetRadius,
          borderTopRightRadius: widgetRadius,
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: dense === true ? 6 : 7,
          color: 'white',
          fontSize: dense === true ? 13 : 14,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            lineHeight: 0,
            /* Bookmark path sits low in the 24×24 viewBox vs cap height of the label */
            transform: 'translateY(-0.14em)',
          }}
        >
          <svg
            width={dense === true ? 18 : 19}
            height={dense === true ? 18 : 19}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            style={{ display: 'block' }}
          >
            <path
              d="M8 5h9a3 3 0 0 1 3 3v12l-6-4-6 4V8a3 3 0 0 1 3-3Z"
              stroke="white"
              strokeWidth="1.85"
              strokeLinejoin="round"
              fill="rgba(255,255,255,0.16)"
            />
          </svg>
        </span>
        <span style={{ lineHeight: 1 }}>Welcome</span>
      </div>
      {/* Dotted divider between bands */}
      <div
        aria-hidden
        style={{
          height: 3,
          marginTop: -1,
          background: '#fbbf24',
          borderBottom: '2px dotted rgba(255,255,255,0.55)',
        }}
      />
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          padding: dense === true ? '13px 16px 12px' : '16px 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderBottomLeftRadius: widgetRadius,
          borderBottomRightRadius: widgetRadius,
        }}
      >
        <div
          style={{
            flex: dense === true ? '1 1 auto' : undefined,
            minHeight: 0,
            overflow: 'hidden',
            color: '#1f2937',
            fontWeight: 400,
            fontSize: bodyFontSize,
            lineHeight: 1.45,
            letterSpacing: '-0.02em',
          }}
        >
          {PORTFOLIO_WELCOME_BODY_COPY}
        </div>
        <span
          style={{
            alignSelf: 'flex-start',
            marginTop: dense === true ? 11 : 16,
            color: '#6b7280',
            fontWeight: 500,
            fontSize: dense === true ? 11.5 : 12,
          }}
        >
          {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

/** Homework-inspired checklist widget (iPad/desktop home only — see reference layout). */
function IpadPortfolioChecklistWidget({
  widgetRadius,
  shellStyle,
  items,
  checked,
  onToggle,
}: {
  widgetRadius: number
  shellStyle: React.CSSProperties
  items: readonly { id: string; label: string }[]
  checked: Record<string, boolean>
  onToggle: (appId: string) => void
}) {
  const remaining = items.reduce((n, row) => n + (!(checked[row.id] ?? false) ? 1 : 0), 0)

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: widgetRadius,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        boxSizing: 'border-box',
        ...shellStyle,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '12px 12px 5px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1px solid rgba(15,23,42,0.07)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              color: '#0f172a',
              fontWeight: 800,
              fontSize: 32,
              lineHeight: 1,
              letterSpacing: '-0.04em',
            }}
          >
            {remaining}
          </div>
          <div
            style={{
              marginTop: 4,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 6,
              color: '#1d4ed8',
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: '-0.02em',
            }}
          >
            <span>Explore</span>
          </div>
        </div>
        <div
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M12 3 2 8l10 5 10-5-10-5Zm-8 9.07V17l8 4 8-4v-4.93l-8 4-8-4Z" />
          </svg>
        </div>
      </div>

      <div
        role="group"
        aria-label="Apps to explore"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
          padding: '14px 10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'space-between',
        }}
      >
        {items.map((row) => {
          const isDone = !!(checked[row.id] ?? false)
          return (
            <button
              key={row.id}
              type="button"
              role="checkbox"
              aria-checked={isDone}
              aria-label={`Visit ${row.label}, ${isDone ? 'completed' : 'not completed'}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggle(row.id)
              }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '7px 2px',
                margin: 0,
                border: 'none',
                borderRadius: 8,
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 999,
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  border: `2px solid ${isDone ? '#2563eb' : '#9ca3af'}`,
                  background: isDone ? '#2563eb' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDone ? (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12.5 L10 17 L19 7"
                      stroke="white"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <span
                style={{
                  fontSize: 12.75,
                  fontWeight: 500,
                  color: isDone ? '#64748b' : '#0f172a',
                  textDecoration: isDone ? 'line-through' : 'none',
                  lineHeight: 1.35,
                  letterSpacing: '-0.02em',
                }}
              >
                Visit {row.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const APP_CONTENT: Record<string, React.ReactNode> = {
  projects: <ProjectsApp />,
  skills: <SkillsApp />,
  experience: <ExperienceApp />,
  chess: <ChessApp />,
  clash: <ClashRoyaleApp />,
  phone: <PhoneApp />,
  email: <EmailApp />,
}

interface MacWindowSession {
  visible: boolean
  drag: { x: number; y: number }
  maximized: boolean
  animKey: number
}

// ─── Modern status-bar pieces (notch-era iPhone) ────────────────────────────

function SignalBars() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="white">
      <rect x="0" y="8" width="3" height="4" rx="0.8" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
      <rect x="10" y="3" width="3" height="9" rx="0.8" />
      <rect x="15" y="0" width="3" height="12" rx="0.8" />
    </svg>
  )
}

function WifiFan() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
      <path d="M8 1.4C5.5 1.4 3.2 2.2 1.3 3.7L0 2.4A11.8 11.8 0 0 1 8 0c3 0 5.8 1 8 2.4l-1.3 1.3A9.8 9.8 0 0 0 8 1.4Z" />
      <path
        d="M8 4.6c-1.7 0-3.3.6-4.5 1.6L2.2 4.9a8.6 8.6 0 0 1 11.6 0l-1.3 1.3A6.9 6.9 0 0 0 8 4.6Z"
        fillOpacity="0.95"
      />
      <path d="M8 7.7c-1 0-1.8.3-2.5.9L8 11l2.5-2.4A4 4 0 0 0 8 7.7Z" />
    </svg>
  )
}

function BatteryModern({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          width: 26,
          height: 13,
          border: '1.2px solid rgba(255,255,255,0.55)',
          borderRadius: 4,
          padding: 1.5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: 'white',
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          width: 2,
          height: 5,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: '0 1px 1px 0',
          marginLeft: 1,
        }}
      />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MobileView() {
  const [activeApp, setActiveApp] = useState<string | null>(null)
  const [time, setTime] = useState('')
  const [phoneShowWelcomeNote, setPhoneShowWelcomeNote] = useState(false)
  const [ipadVisitChecked, setIpadVisitChecked] = useState<Record<string, boolean>>(() =>
    normalizeIpadVisitChecklist(null),
  )
  const [macSessions, setMacSessions] = useState<Record<string, MacWindowSession>>({})
  const [macLaunchAnchors, setMacLaunchAnchors] = useState<Partial<Record<string, DOMRect>>>({})
  const [macFocusStack, setMacFocusStack] = useState<string[]>([])
  /** Order of extra (non-{@link DOCK_IDS}) dock icons — stable; not tied to window z-order. */
  const [macDockExtraOrder, setMacDockExtraOrder] = useState<string[]>([])
  const dockIconRefs = useRef<Partial<Record<string, HTMLButtonElement>>>({})
  const macTitleDragRef = useRef<{
    active: boolean
    appId: string | null
    startX: number
    startY: number
    baseX: number
    baseY: number
  }>({ active: false, appId: null, startX: 0, startY: 0, baseX: 0, baseY: 0 })
  const macSessionsRef = useRef(macSessions)
  const macFocusStackRef = useRef(macFocusStack)
  const phoneHomeScrollRef = useRef<HTMLDivElement>(null)
  const phoneHomeGridRef = useRef<HTMLDivElement>(null)
  const { scale, viewportW, viewportH, desktopMacWindows } = useUILayout()
  const S = SIZES[scale]

  useEffect(() => {
    macSessionsRef.current = macSessions
  }, [macSessions])

  useEffect(() => {
    macFocusStackRef.current = macFocusStack
  }, [macFocusStack])

  const bringMacWindowToFront = useCallback((appId: string) => {
    setMacFocusStack((st) => [...st.filter((x) => x !== appId), appId])
  }, [])

  const minimizeMacWindow = useCallback((appId: string) => {
    const el = dockIconRefs.current[appId]
    if (el) {
      setMacLaunchAnchors((prev) => ({ ...prev, [appId]: el.getBoundingClientRect() }))
    }
    requestAnimationFrame(() => {
      setMacSessions((prev) =>
        prev[appId] ? { ...prev, [appId]: { ...prev[appId], visible: false } } : prev,
      )
    })
  }, [])

  const minimizeTopMacWindow = useCallback(() => {
    const stack = macFocusStackRef.current
    const sessions = macSessionsRef.current
    for (let i = stack.length - 1; i >= 0; i--) {
      const id = stack[i]
      if (sessions[id]?.visible) {
        minimizeMacWindow(id)
        return
      }
    }
  }, [minimizeMacWindow])

  const quitMacSession = useCallback((appId: string) => {
    setMacSessions((prev) => {
      const { [appId]: _removed, ...rest } = prev
      return rest
    })
    setMacFocusStack((st) => st.filter((x) => x !== appId))
    setMacDockExtraOrder((o) => o.filter((x) => x !== appId))
    setMacLaunchAnchors((prev) => {
      const { [appId]: _a, ...r } = prev
      return r
    })
  }, [])

  const closeMobileAppOverlay = useCallback(() => {
    setActiveApp(null)
  }, [])

  useEffect(() => {
    if (!desktopMacWindows) {
      setMacSessions({})
      setMacFocusStack([])
      setMacDockExtraOrder([])
      setMacLaunchAnchors({})
    }
  }, [desktopMacWindows])

  const openApp = useCallback(
    (appId: string, anchorEl?: HTMLElement | null) => {
      const externalUrl = APP_OPEN_IN_NEW_TAB[appId]
      if (externalUrl) {
        window.open(externalUrl, '_blank', 'noopener,noreferrer')
        return
      }

      if (!desktopMacWindows) {
        setActiveApp(appId)
        return
      }

      const dockEl = dockIconRefs.current[appId]
      const ar =
        anchorEl?.getBoundingClientRect() ?? dockEl?.getBoundingClientRect() ?? null
      if (ar) {
        setMacLaunchAnchors((p) => ({ ...p, [appId]: ar }))
      }

      const hadSession = macSessions[appId] != null

      setMacSessions((prev) => {
        const existing = prev[appId]
        if (existing?.visible) {
          return prev
        }
        if (existing && !existing.visible) {
          return {
            ...prev,
            [appId]: { ...existing, visible: true, animKey: existing.animKey + 1 },
          }
        }
        return {
          ...prev,
          [appId]: {
            visible: true,
            drag: { x: 0, y: 0 },
            maximized: false,
            animKey: 0,
          },
        }
      })

      bringMacWindowToFront(appId)

      if (
        !hadSession &&
        appOpensInPortfolio(appId) &&
        !(DOCK_IDS as readonly string[]).includes(appId)
      ) {
        setMacDockExtraOrder((o) => (o.includes(appId) ? o : [...o, appId]))
      }
    },
    [desktopMacWindows, bringMacWindowToFront, macSessions],
  )

  const onMacTitlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, appId: string) => {
      bringMacWindowToFront(appId)
      const sess = macSessionsRef.current[appId]
      if (!sess || sess.maximized) return
      e.preventDefault()
      macTitleDragRef.current = {
        active: true,
        appId,
        startX: e.clientX,
        startY: e.clientY,
        baseX: sess.drag.x,
        baseY: sess.drag.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [bringMacWindowToFront],
  )

  const onMacTitlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = macTitleDragRef.current
      if (!d.active || !d.appId) return
      const sess = macSessionsRef.current[d.appId]
      if (!sess || sess.maximized) return
      const macW = Math.min(960, viewportW - 80)
      const macH = Math.min(640, viewportH - 100)
      const rawX = d.baseX + e.clientX - d.startX
      const rawY = d.baseY + e.clientY - d.startY
      const l = (viewportW - macW) / 2 + rawX
      const t = (viewportH - macH) / 2 + rawY
      const margin = 16
      const cl = Math.min(viewportW - macW - margin, Math.max(margin, l))
      const ct = Math.min(viewportH - macH - margin, Math.max(margin, t))
      setMacSessions((prev) => {
        const p = prev[d.appId!]
        if (!p) return prev
        return {
          ...prev,
          [d.appId!]: {
            ...p,
            drag: { x: rawX + (cl - l), y: rawY + (ct - t) },
          },
        }
      })
    },
    [viewportW, viewportH],
  )

  const onMacTitlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    macTitleDragRef.current.active = false
    macTitleDragRef.current.appId = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      //
    }
  }, [])

  useLayoutEffect(() => {
    if (scale !== 'phone') {
      setPhoneShowWelcomeNote(false)
      return
    }

    const scrollEl = phoneHomeScrollRef.current
    const gridEl = phoneHomeGridRef.current
    if (!scrollEl || !gridEl) return

    const run = () => {
      const sr = scrollEl.getBoundingClientRect()
      const gr = gridEl.getBoundingClientRect()
      if (gr.bottom <= sr.top + 2) {
        setPhoneShowWelcomeNote(false)
        return
      }
      const gapPx = sr.bottom - gr.bottom
      setPhoneShowWelcomeNote(gapPx >= PHONE_WELCOME_NOTE_MIN_SPACE_BELOW_GRID_PX)
    }

    run()
    const ro = new ResizeObserver(run)
    ro.observe(scrollEl)
    ro.observe(gridEl)
    scrollEl.addEventListener('scroll', run, { passive: true })
    window.addEventListener('resize', run)
    return () => {
      ro.disconnect()
      scrollEl.removeEventListener('scroll', run)
      window.removeEventListener('resize', run)
    }
  }, [scale])

  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
    }
    fmt()
    const id = setInterval(fmt, 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setIpadVisitChecked((prev) => {
      const openedIds = desktopMacWindows ? Object.keys(macSessions) : activeApp ? [activeApp] : []
      let next = prev
      let changed = false
      for (const appId of openedIds) {
        if (!(IPAD_VISIT_CHECKLIST_IDS as readonly string[]).includes(appId)) continue
        if (next[appId] === true) continue
        next = { ...next, [appId]: true }
        changed = true
      }
      return changed ? next : prev
    })
  }, [desktopMacWindows, macSessions, activeApp])

  const toggleIpadVisitChecklistRow = (id: string) => {
    setIpadVisitChecked((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? false),
    }))
  }
  const activeAppDef = APPS.find((a) => a.id === activeApp)
  const dockApps = DOCK_IDS.map((id) => APPS.find((a) => a.id === id)!).filter(Boolean)
  const dockIdSet = new Set(DOCK_IDS as readonly string[])
  /** Running apps not in the fixed dock strip, in stable open order (not z-order). */
  const sessionExtraKeys = desktopMacWindows
    ? Object.keys(macSessions).filter(
        (id) => appOpensInPortfolio(id) && macSessions[id] != null && !dockIdSet.has(id),
      )
    : []
  const orderedExtras = macDockExtraOrder.filter((id) => sessionExtraKeys.includes(id))
  const missingExtras = sessionExtraKeys.filter((id) => !orderedExtras.includes(id)).sort(
    (a, b) => APPS.findIndex((app) => app.id === a) - APPS.findIndex((app) => app.id === b),
  )
  const extraDockIds = [...orderedExtras, ...missingExtras]
  const dockRow: AppDef[] = [
    ...dockApps,
    ...extraDockIds.map((id) => APPS.find((a) => a.id === id)!).filter(Boolean),
  ]
  const visibleMacEntries = Object.entries(macSessions).filter(([, s]) => s.visible)
  const showMacBackdrop = desktopMacWindows && visibleMacEntries.length > 0
  // Apps shown on the home grid (phone/email live only in the dock to keep the widget layout tight)
  const homeApps = APPS.filter((a) => a.id !== 'phone' && a.id !== 'email')

  const homeAppButtons = homeApps.map((app, i) => (
    <motion.button
      key={app.id}
      initial={{ opacity: 0, scale: 0.7, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 320, damping: 24 }}
      whileTap={{ scale: 0.86 }}
      onClick={(e) => openApp(app.id, e.currentTarget)}
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: S.appIconLabelGap,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: S.appIconSize,
          height: S.appIconSize,
          borderRadius: S.appIconRadius,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: app.background,
        }}
      >
        <app.Icon size={S.appIconSvgSize} />
      </div>
      <span
        className="ios-label-shadow"
        style={{
          color: 'white',
          fontSize: S.appLabelFontSize,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {app.label}
      </span>
    </motion.button>
  ))

  return (
    <div
      className="wallpaper-mobile select-none"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      }}
    >
      {/* ── Status bar (iPhone notch / iPad flat) ─────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          position: 'relative',
          height: S.statusBarHeight,
          padding: S.statusBarPadding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: S.statusFontSize,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            minWidth: 56,
          }}
        >
          {time}
        </span>

        {S.showNotch ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: S.notchWidth,
              height: S.notchHeight,
              background: '#000',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
            }}
          />
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: S.statusGap }}>
          <SignalBars />
          <WifiFan />
          <BatteryModern percent={73} />
        </div>
      </div>

      {/* ── Home screen body ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: S.homeBodyPadding,
          overflowX: 'hidden',
          overflowY: scale === 'phone' ? 'hidden' : 'auto',
          minHeight: 0,
        }}
      >
        {scale === 'phone' ? (
          <div
            ref={phoneHomeScrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: S.gridRowGap ?? 14,
              }}
            >
              <div
                ref={phoneHomeGridRef}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    S.cellWidth != null && S.gridCols != null
                      ? `repeat(${S.gridCols}, ${S.cellWidth}px)`
                      : `repeat(${S.gridCols ?? 4}, 1fr)`,
                  gridAutoRows: `minmax(0, ${S.tileHeight ?? 76}px)`,
                  columnGap: S.gridColGap ?? 14,
                  rowGap: S.gridRowGap ?? 14,
                  justifyContent: S.cellWidth != null ? 'center' : 'stretch',
                }}
              >
                {homeAppButtons}
                <FriendsPhotoWidget
                  widgetRadius={S.widgetRadius}
                  wrapperStyle={{ gridArea: S.friendsArea }}
                />
              </div>
              {phoneShowWelcomeNote ? (
                <PortfolioNoteWidget
                  dense
                  widgetRadius={S.widgetRadius}
                  shellStyle={WELCOME_NOTE_PHONE_SHELL_STYLE}
                  bodyFontSize={12}
                />
              ) : null}
              <div>
                <MusicHomeWidget
                  widgetRadius={S.widgetRadius}
                  maxWidth={S.musicMaxWidth}
                  wrapperStyle={{
                    width: '100%',
                    height: TABLET_MUSIC_BAR_HEIGHT_PX,
                    flexShrink: 0,
                    alignSelf: 'stretch',
                    alignItems: 'stretch',
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* iPad/desktop — left stack fills height to dock; checklist grows in that column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                gap: S.ipadAppsToWidgetsGap ?? TABLET_TILE_GUTTER_PX,
                flex: 1,
                minHeight: 0,
                width: '100%',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: TABLET_NOTE_TO_CHECKLIST_GAP_PX,
                  alignSelf: 'stretch',
                  minHeight: 0,
                }}
              >
                <PortfolioNoteWidget
                  widgetRadius={S.widgetRadius}
                  shellStyle={WELCOME_NOTE_TABLET_SHELL_STYLE}
                  bodyFontSize={13}
                />
                <IpadPortfolioChecklistWidget
                  widgetRadius={S.widgetRadius}
                  shellStyle={IPAD_HOME_CHECKLIST_SHELL_STYLE}
                  items={IPAD_VISIT_CHECKLIST_ITEMS}
                  checked={ipadVisitChecked}
                  onToggle={toggleIpadVisitChecklistRow}
                />
              </div>
              <div
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  alignSelf: 'flex-start',
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignContent: 'flex-start',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  columnGap: S.ipadAppWrapGap ?? TABLET_TILE_GUTTER_PX,
                  rowGap: S.ipadAppWrapGap ?? TABLET_TILE_GUTTER_PX,
                }}
              >
                {homeAppButtons}
              </div>

              <div
                style={{
                  flexShrink: 0,
                  width: TABLET_WIDGET_STRIP_CLAMP,
                  alignSelf: 'flex-start',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: S.ipadWidgetStackGap ?? 24,
                }}
              >
                <FriendsPhotoWidget
                  widgetRadius={S.widgetRadius}
                  wrapperStyle={{
                    width: '100%',
                    flexShrink: 0,
                    height: 'clamp(228px, 34vh, 320px)',
                  }}
                />
                <MusicHomeWidget
                  tabletBar
                  widgetRadius={S.widgetRadius}
                  maxWidth={null}
                  wrapperStyle={{
                    width: '100%',
                    height: TABLET_MUSIC_BAR_HEIGHT_PX,
                    flexShrink: 0,
                    alignItems: 'stretch',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Dock area (page indicator dots + dock pill) ───────────────────── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: S.dockOuterPadding,
        }}
      >
        {/* Page indicator dots — sit directly above the dock pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginBottom: S.pageDotsMarginBottom,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="white" fillOpacity="0.7">
            <circle cx="11" cy="11" r="6" fill="none" stroke="white" strokeWidth="1.6" />
            <path d="m15.5 15.5 3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.95 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.45 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.45 }} />
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            overflowX: desktopMacWindows ? 'auto' : 'visible',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.dockGap,
              padding: S.dockInnerPadding,
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: S.dockRadius,
              width: 'max-content',
            }}
          >
          {dockRow.map((app) => {
            const showDockDot =
              desktopMacWindows ? macSessions[app.id] != null : activeApp === app.id
            return (
            <motion.button
              key={app.id}
              ref={(el) => {
                if (el) dockIconRefs.current[app.id] = el
                else delete dockIconRefs.current[app.id]
              }}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={(e) => openApp(app.id, e.currentTarget)}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: S.dockIconSize,
                height: S.dockIconSize,
                display: 'block',
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                lineHeight: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: S.dockIconRadius,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: app.background,
                }}
              >
                <app.Icon size={S.appIconSvgSize} />
              </div>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: -5,
                  width: 5,
                  height: 5,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {showDockDot ? (
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: 'white',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                    }}
                  />
                ) : null}
              </div>
            </motion.button>
            )
          })}
          </div>
        </div>
      </div>

      {/* ── App overlay ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showMacBackdrop ? (
          <>
            <motion.div
              key="mac-os-backdrop"
              role="presentation"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                background: 'rgba(0,0,0,0.38)',
              }}
              onClick={minimizeTopMacWindow}
            />
            {visibleMacEntries.map(([macAppId, session]) => {
              const appDef = APPS.find((a) => a.id === macAppId)
              if (!appDef) return null

              const macW = session.maximized ? viewportW - 40 : Math.min(960, viewportW - 80)
              const macH = session.maximized ? viewportH - 40 : Math.min(640, viewportH - 100)
              const finalLeft = session.maximized
                ? 20
                : (viewportW - macW) / 2 + session.drag.x
              const finalTop = session.maximized
                ? 20
                : (viewportH - macH) / 2 + session.drag.y
              const launchRect = macLaunchAnchors[macAppId]
              const iconCx =
                launchRect != null ? launchRect.left + launchRect.width / 2 : viewportW / 2
              const iconCy =
                launchRect != null ? launchRect.top + launchRect.height / 2 : viewportH / 2
              const originX = iconCx - finalLeft
              const originY = iconCy - finalTop
              const growScale =
                launchRect != null ? Math.max(0.14, launchRect.width / macW) : 0.88
              const fi = macFocusStack.indexOf(macAppId)
              const zWin = 51 + (fi === -1 ? macFocusStack.length : fi)

              return (
                <motion.div
                  key={`mac-win-${macAppId}-${session.animKey}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`mac-window-title-${macAppId}`}
                  initial={{ scale: growScale, opacity: 0.88 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: Math.min(1, growScale * 1.1), opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                  style={{
                    position: 'fixed',
                    left: finalLeft,
                    top: finalTop,
                    width: macW,
                    height: macH,
                    zIndex: zWin,
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow:
                      '0 25px 80px rgba(0,0,0,0.52), 0 0 0 0.5px rgba(255,255,255,0.14)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#e8e8ea',
                    transformOrigin: `${originX}px ${originY}px`,
                  }}
                  onPointerDownCapture={() => bringMacWindowToFront(macAppId)}
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <div
                    onPointerDown={(e) => onMacTitlePointerDown(e, macAppId)}
                    onPointerMove={onMacTitlePointerMove}
                    onPointerUp={onMacTitlePointerEnd}
                    onPointerCancel={onMacTitlePointerEnd}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: 'linear-gradient(180deg, #ececed 0%, #e2e2e4 100%)',
                      borderBottom: '1px solid rgba(0,0,0,0.09)',
                      cursor: session.maximized ? 'default' : 'grab',
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                      }}
                      onPointerDown={(ev) => ev.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={() => quitMacSession(macAppId)}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          background: '#ff5f57',
                          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.14)',
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Minimize"
                        onClick={() => minimizeMacWindow(macAppId)}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          background: '#febc2e',
                          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.1)',
                        }}
                      />
                      <button
                        type="button"
                        aria-label={session.maximized ? 'Restore' : 'Enter full screen'}
                        onClick={() => {
                          setMacSessions((prev) => {
                            const s = prev[macAppId]
                            if (!s) return prev
                            return {
                              ...prev,
                              [macAppId]: {
                                ...s,
                                maximized: !s.maximized,
                                drag: { x: 0, y: 0 },
                              },
                            }
                          })
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          background: '#28c840',
                          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.1)',
                        }}
                      />
                    </div>
                    <span
                      id={`mac-window-title-${macAppId}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#2d2d2f',
                        letterSpacing: '-0.02em',
                        pointerEvents: 'none',
                      }}
                    >
                      {appDef.label}
                    </span>
                    <div style={{ width: 52 }} />
                  </div>
                  <AppSurfaceContext.Provider value="light">
                    <div
                      className="window-body window-body-mac-grey"
                      style={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        background: '#ececed',
                      }}
                    >
                      {APP_CONTENT[macAppId] ?? null}
                    </div>
                  </AppSurfaceContext.Provider>
                </motion.div>
              )
            })}
          </>
        ) : null}
        {activeApp && !desktopMacWindows ? (
          <motion.div
            key={activeApp}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.9 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--app-surface)',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 10,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.25)',
                }}
              />
            </div>
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={closeMobileAppOverlay}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 500,
                  fontSize: 14,
                  color: '#5ac8fa',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 4px',
                  cursor: 'pointer',
                }}
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                  <path
                    d="M7 1L1 7L7 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span style={{ marginLeft: 2 }}>Home</span>
              </motion.button>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
                  {activeAppDef?.label}
                </span>
              </div>
              <div style={{ width: 62 }} />
            </div>
            <div className="window-body" style={{ flex: 1, overflowY: 'auto' }}>
              {activeApp ? APP_CONTENT[activeApp] : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
