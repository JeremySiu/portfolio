import { useState, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { projects, type Project } from '../../data/content'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'

// ─── Tech badge palette ────────────────────────────────────────────────────
// Each known tag gets a brand-flavoured chip. Unknown tags fall back to a
// neutral violet pill so new entries stay readable until palette is extended.

interface TagStyle {
  bg: string
  fg: string
  border?: string
  /** Improves contrast on busy gradients (e.g. Gemini). */
  textShadow?: string
}

const LANGCHAIN_FAMILY_STYLE: TagStyle = {
  bg: '#1c3532',
  fg: '#ffffff',
  border: 'rgba(255,255,255,0.2)',
}

/** Google Gemini logo hues: red-pink → blue → green → yellow */
const GEMINI_TAG_STYLE: TagStyle = {
  bg: 'conic-gradient(from -35deg at 50% 50%, #ff5252 0deg, #4285f4 100deg, #34a853 200deg, #fbbc04 290deg, #ff5252 360deg)',
  fg: '#ffffff',
  border: 'rgba(255,255,255,0.35)',
  textShadow: '0 1px 2px rgba(0,0,0,0.55)',
}

const TAG_PALETTE: Record<string, TagStyle> = {
  react: { bg: '#0b2530', fg: '#61dafb', border: 'rgba(97,218,251,0.45)' },
  'react flow': { bg: '#0b2530', fg: '#61dafb', border: 'rgba(97,218,251,0.45)' },
  'next.js': { bg: '#ffffff', fg: '#0a0a0a' },
  nextjs: { bg: '#ffffff', fg: '#0a0a0a' },
  'node.js': { bg: '#1f8a36', fg: '#ffffff' },
  nodejs: { bg: '#1f8a36', fg: '#ffffff' },
  typescript: { bg: '#3178c6', fg: '#ffffff' },
  javascript: { bg: '#f7df1e', fg: '#0a0a0a' },
  python: { bg: '#3776ab', fg: '#ffffff' },
  go: { bg: '#00add8', fg: '#ffffff' },
  rust: { bg: '#dea584', fg: '#1a1a1a' },
  'scikit-learn': {
    bg: '#2b9fdc',
    fg: '#ffffff',
    border: 'rgba(255,255,255,0.28)',
  },
  /** Pandas logo blue */
  pandas: { bg: '#5682a3', fg: '#ffffff', border: 'rgba(255,255,255,0.25)' },
  /** Seaborn logo blue-purple */
  seaborn: { bg: '#4c4c7a', fg: '#ffffff', border: 'rgba(255,255,255,0.22)' },
  /** NumPy logo blue (wordmark) */
  numpy: { bg: '#4d77cf', fg: '#ffffff', border: 'rgba(255,255,255,0.28)' },
  /** Jupyter brand orange */
  jupyter: { bg: '#f37626', fg: '#ffffff', border: 'rgba(255,255,255,0.3)' },
  // Playwright: comedy-mask greens (light → dark)
  playwright: {
    bg: 'linear-gradient(90deg, #4caf50 0%, #2e7d32 100%)',
    fg: '#ffffff',
    border: 'rgba(255,255,255,0.25)',
  },
  sql: { bg: '#4a6fa1', fg: '#ffffff' },
  postgresql: { bg: '#336791', fg: '#ffffff' },
  mongodb: { bg: '#13aa52', fg: '#ffffff' },
  redis: { bg: '#dc382c', fg: '#ffffff' },
  sqlite: { bg: '#0b3b57', fg: '#ffffff' },
  clickhouse: { bg: '#ffcc00', fg: '#0a0a0a' },
  /** ColabFold — Google Colab oranges (#F9AB00 bright, #E37400 deep) */
  colabfold: { bg: '#E37400', fg: '#ffffff', border: 'rgba(249,175,0,0.95)' },
  kafka: { bg: '#231f20', fg: '#ffffff', border: 'rgba(255,255,255,0.18)' },
  'aws s3': { bg: '#ff9900', fg: '#0a0a0a' },
  aws: { bg: '#ff9900', fg: '#0a0a0a' },
  docker: { bg: '#2496ed', fg: '#ffffff' },
  kubernetes: { bg: '#326ce5', fg: '#ffffff' },
  /** LangChain / LangFlow: same forest-teal pill */
  langchain: LANGCHAIN_FAMILY_STYLE,
  langflow: LANGCHAIN_FAMILY_STYLE,
  graphql: { bg: '#e10098', fg: '#ffffff' },
  tailwind: { bg: '#0ea5e9', fg: '#ffffff' },
  'tailwind css': { bg: '#0ea5e9', fg: '#ffffff' },
  fastapi: { bg: '#009688', fg: '#ffffff' },
  websockets: { bg: '#8b5cf6', fg: '#ffffff' },
  openai: { bg: '#10a37f', fg: '#ffffff' },
  gemini: GEMINI_TAG_STYLE,
  'gemini api': GEMINI_TAG_STYLE,
  yjs: { bg: '#ec4899', fg: '#ffffff' },
  indexeddb: { bg: '#a855f7', fg: '#ffffff' },
  'd3.js': { bg: '#f97316', fg: '#ffffff' },
  d3: { bg: '#f97316', fg: '#ffffff' },
  vite: { bg: '#6d28d9', fg: '#ffe066' },
  'framer motion': { bg: '#ec4899', fg: '#ffffff' },
  'rest apis': { bg: '#6366f1', fg: '#ffffff' },
  grpc: { bg: '#244c5a', fg: '#ffffff' },
  prisma: { bg: '#0f172a', fg: '#ffffff', border: 'rgba(255,255,255,0.18)' },
}

const FALLBACK_TAG_DARK: TagStyle = {
  bg: 'rgba(167,139,250,0.22)',
  fg: '#ddd6fe',
  border: 'rgba(167,139,250,0.35)',
}

const FALLBACK_TAG_LIGHT: TagStyle = {
  bg: 'rgba(91,33,182,0.12)',
  fg: '#5b21b6',
  border: 'rgba(91,33,182,0.32)',
}

/** Wider-than-tall banner (default 16:9). `maxHeightPx` caps size on wide viewports. */
const BANNER_ASPECT_RATIO = '16 / 9'
const BANNER_MAX_HEIGHT_GRID_PX = 200
const BANNER_MAX_HEIGHT_DETAIL_PX = 240

function tagStyle(tag: string, lightSurface: boolean): TagStyle {
  return TAG_PALETTE[tag.toLowerCase()] ?? (lightSurface ? FALLBACK_TAG_LIGHT : FALLBACK_TAG_DARK)
}

// ─── Banner (image with graceful gradient fallback) ────────────────────────

function bannerWidthCapCss(aspectRatio: string, maxHeightPx: number): string {
  const parts = aspectRatio.split('/').map((s) => parseFloat(s.trim()))
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || parts[1] === 0) {
    return `min(100%, calc(${maxHeightPx}px * 16 / 9))`
  }
  const [w, h] = parts
  return `min(100%, calc(${maxHeightPx}px * ${w} / ${h}))`
}

function ProjectBanner({
  project,
  aspectRatio = BANNER_ASPECT_RATIO,
  maxHeightPx,
}: {
  project: Project
  aspectRatio?: string
  maxHeightPx: number
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const bannerWidthCap = bannerWidthCapCss(aspectRatio, maxHeightPx)

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: bannerWidthCap,
          maxWidth: '100%',
          position: 'relative',
          aspectRatio,
          maxHeight: maxHeightPx,
          containerType: 'inline-size' as React.CSSProperties['containerType'],
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(120,120,128,0.2)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.32)',
        }}
      >
        {project.bannerImage && !imgFailed ? (
          <img
            src={project.bannerImage}
            alt={`${project.name} banner`}
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgFailed(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: project.bannerObjectPosition ?? 'center',
              transform: project.bannerImageScale ? `scale(${project.bannerImageScale})` : undefined,
              transformOrigin: project.bannerImageTransformOrigin ?? 'center center',
              display: 'block',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        ) : null}

        {(!project.bannerImage || imgFailed || !imgLoaded) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(1.5rem, 32cqw, 2.5rem)',
                lineHeight: 1,
                opacity: 0.35,
              }}
            >
              ◌
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Grid view ──────────────────────────────────────────────────────────────

function ProjectsGrid({ onSelect }: { onSelect: (p: Project) => void }) {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'
  const titleC = L ? '#161616' : 'white'
  const tagC = L ? 'rgba(24,24,27,0.6)' : 'rgba(255,255,255,0.55)'

  return (
    <div
      style={{
        width: '100%',
        padding: '16px 16px 40px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 16,
        }}
      >
      {projects.map((project, i) => (
        <motion.button
          key={project.id}
          type="button"
          onClick={() => onSelect(project)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 280, damping: 26 }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <ProjectBanner
            project={project}
            maxHeightPx={BANNER_MAX_HEIGHT_GRID_PX}
          />

          <div style={{ padding: '0 2px', width: '100%' }}>
            <div
              style={{
                color: titleC,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {project.name}
            </div>
            <div
              style={{
                marginTop: 2,
                color: tagC,
                fontSize: 12.5,
                lineHeight: 1.4,
              }}
            >
              {project.tagline}
            </div>
          </div>
        </motion.button>
      ))}
      </div>
    </div>
  )
}

// ─── Detail view ────────────────────────────────────────────────────────────

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'
  const h2 = L ? '#111827' : 'white'
  const tagline = L ? 'rgba(24,24,27,0.65)' : 'rgba(255,255,255,0.6)'
  const body = L ? '#3f3f46' : 'rgba(255,255,255,0.78)'
  const ghBg = L ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
  const ghBorder = L ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.22)'
  const ghFg = L ? '#18181b' : '#ffffff'

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        padding: '14px 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* In-app back button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          color: '#5ac8fa',
          background: 'transparent',
          border: 'none',
          padding: '4px 0',
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
        Projects
      </motion.button>

      <ProjectBanner project={project} maxHeightPx={BANNER_MAX_HEIGHT_DETAIL_PX} />

      {/* Title + tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2
          style={{
            color: h2,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {project.name}
        </h2>
        <p
          style={{
            color: tagline,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {project.tagline}
        </p>
      </div>

      {/* Tech pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {project.tags.map((tag) => {
          const s = tagStyle(tag, L)
          return (
            <span
              key={tag}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 999,
                background: s.bg,
                color: s.fg,
                border: s.border ? `1px solid ${s.border}` : 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                lineHeight: 1.2,
                ...(s.textShadow ? { textShadow: s.textShadow } : {}),
              }}
            >
              {tag}
            </span>
          )
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {project.liveUrl ? (
          <motion.a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#1a1300',
              background: '#f5b400',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" />
            </svg>
            Live View
          </motion.a>
        ) : null}

        {project.githubUrl ? (
          <motion.a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: ghFg,
              background: ghBg,
              border: ghBorder,
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2.2c-5.5 0-10 4.5-10 10 0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 22 12.2c0-5.5-4.5-10-10-10Z"
              />
            </svg>
            GitHub
          </motion.a>
        ) : null}
      </div>

      {/* Description */}
      <div
        style={{
          color: body,
          fontSize: 14.5,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}
      >
        {project.description}
      </div>
    </motion.div>
  )
}

// ─── Public component ──────────────────────────────────────────────────────

export default function ProjectsApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? projects.find((p) => p.id === selectedId) ?? null : null

  return (
    <AnimatePresence mode="wait" initial={false}>
      {selected ? (
        <ProjectDetail
          key="detail"
          project={selected}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <ProjectsGrid onSelect={(p) => setSelectedId(p.id)} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
