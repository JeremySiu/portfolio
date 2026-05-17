import { useContext } from 'react'
import { experiences } from '../../data/content'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'

/** Matches mobile app overlay “Home” control (`MobileView`). */
const ACCENT = '#5ac8fa'

/** Outer padding and spacing between sections (px). */
const PAGE = { x: 20, top: 24, bottom: 32 } as const
const ROW = { gap: 16, contentBottom: 44, contentBottomLast: 16 } as const
const TIMELINE = { colWidth: 44, logoSize: 44, connectorTop: 6, connectorMinH: 40 } as const
const BLOCK = { metaAfterTitle: 8, bodyAfterMeta: 14, linkAfterBody: 18 } as const

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ExperienceApp() {
  const surface = useContext(AppSurfaceContext)
  const L = surface === 'light'
  const ring = L ? '#e4e4e7' : '#3f3f46'
  const h3Class = L ? 'text-base font-semibold leading-snug text-[#18181b]' : 'text-base font-semibold leading-snug text-white'
  const metaColor = L ? '#52525b' : undefined
  const bodyColor = L ? '#3f3f46' : undefined

  return (
    <div
      className="min-h-full"
      style={{
        background: 'transparent',
        fontFamily: 'inherit',
        padding: `${PAGE.top}px ${PAGE.x}px ${PAGE.bottom}px`,
        boxSizing: 'border-box',
      }}
    >
      <div className="flex flex-col">
        {experiences.map((exp, idx) => {
          const meta = [exp.period, exp.company, exp.location].join(' · ')
          const isLast = idx === experiences.length - 1
          const contentPadBottom = isLast ? ROW.contentBottomLast : ROW.contentBottom

          return (
            <div key={exp.id} className="flex" style={{ gap: ROW.gap }}>
              <div
                className="flex shrink-0 flex-col items-center"
                style={{ width: TIMELINE.colWidth }}
              >
                <div
                  className="shrink-0 overflow-hidden rounded-xl"
                  style={{
                    width: TIMELINE.logoSize,
                    height: TIMELINE.logoSize,
                    background: '#ffffff',
                    border: `1.5px solid ${ring}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {exp.logoSrc ? (
                    <img
                      src={exp.logoSrc}
                      alt={exp.company}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: 4,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: ACCENT,
                      }}
                    />
                  )}
                </div>
                {!isLast && (
                  <div
                    className="w-px flex-1"
                    style={{
                      marginTop: TIMELINE.connectorTop,
                      background: ring,
                      minHeight: TIMELINE.connectorMinH,
                    }}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1" style={{ paddingBottom: contentPadBottom }}>
                <h3
                  className={h3Class}
                  style={{ margin: 0, paddingTop: 4 }}
                >
                  {exp.role}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    margin: 0,
                    marginTop: BLOCK.metaAfterTitle,
                    color: metaColor ?? '#b3b3b3',
                  }}
                >
                  {meta}
                </p>
                <ul
                  className="list-outside list-disc space-y-2 text-sm leading-relaxed"
                  style={{
                    margin: 0,
                    marginTop: BLOCK.bodyAfterMeta,
                    paddingLeft: '1.125rem',
                    color: bodyColor ?? '#d0d0d0',
                  }}
                >
                  {exp.bullets.map((bullet, bi) => (
                    <li key={`${exp.id}-${bi}`} className="pl-1">
                      {bullet}
                    </li>
                  ))}
                </ul>
                {exp.learnMoreUrl ? (
                  <a
                    href={exp.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium"
                    style={{
                      marginTop: BLOCK.linkAfterBody,
                      gap: 6,
                      color: ACCENT,
                    }}
                  >
                    Learn more
                    <ExternalLinkIcon />
                  </a>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
