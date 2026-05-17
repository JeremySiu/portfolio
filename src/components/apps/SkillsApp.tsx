import { useState } from 'react'
import { useContext } from 'react'
import { skillCategories } from '../../data/content'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'

const PILL_FG = '#0b0e14'
const ICON_COLOR = '0b0e14'

/** Per-skill Simple Icons fill (hex without `#`). Default matches pill text. */
const SKILL_ICON_COLORS: Record<string, string> = {
  /** Mask-inspired forest green */
  playwright: '2e7d32',
}

/** Simple Icons CDN slugs (dark fill to match light pills). */
const SKILL_SLUGS: Record<string, string> = {
  'c/c++': 'cplusplus',
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  html: 'html5',
  'css/scss': 'sass',
  bash: 'gnubash',
  react: 'react',
  'node.js': 'nodedotjs',
  vite: 'vite',
  playwright: 'playwright',
  'scikit-learn': 'scikitlearn',
  pytorch: 'pytorch',
  pandas: 'pandas',
  numpy: 'numpy',
  langchain: 'langchain',
  pytest: 'pytest',
  linux: 'linux',
  git: 'git',
  'vs code': 'visualstudiocode',
  cursor: 'cursor',
  'google cloud': 'googlecloud',
  aws: 'amazonaws',
  postgresql: 'postgresql',
  supabase: 'supabase',
  jupyter: 'jupyter',
  matlab: 'mathworks',
  figma: 'figma',
  arduino: 'arduino',
}

function skillSlug(label: string): string | undefined {
  return SKILL_SLUGS[label.trim().toLowerCase()]
}

function FallbackGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M8 9.5 4.5 13 8 16.5M16 9.5 19.5 13 16 16.5M14.2 7.2l-4.4 9.6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SkillGlyph({ label }: { label: string }) {
  const slug = skillSlug(label)
  const key = label.trim().toLowerCase()
  const iconColor = SKILL_ICON_COLORS[key] ?? ICON_COLOR
  const [failed, setFailed] = useState(false)
  if (!slug || failed) {
    return <FallbackGlyph />
  }
  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}/${iconColor}`}
      alt=""
      width={18}
      height={18}
      className="shrink-0 object-contain"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function SkillPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-sm font-medium"
      style={{
        background: '#d2d2d8',
        color: PILL_FG,
        padding: '16px 28px',
        borderRadius: 0,
      }}
    >
      <span className="flex items-center justify-center text-[#0b0e14] [&_img]:block">
        <SkillGlyph label={label} />
      </span>
      {label}
    </span>
  )
}

export default function SkillsApp() {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'

  return (
    <div
      className="min-h-full py-6 pb-10"
      style={{
        background: 'transparent',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif",
        paddingLeft: 'clamp(20px, 6vw, 36px)',
        paddingRight: 'clamp(20px, 6vw, 36px)',
      }}
    >
      <div className="mt-6 flex flex-col gap-10">
        {skillCategories.map((category) => (
          <section key={category.name}>
            <h2
              className={`mb-4 text-base font-bold ${L ? 'text-[#18181b]' : 'text-white/90'}`}
            >
              {category.name}
            </h2>
            <div className="flex flex-wrap gap-3">
              {category.skills.map((skill) => (
                <SkillPill key={`${category.name}-${skill}`} label={skill} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
