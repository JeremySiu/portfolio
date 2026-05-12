import { experiences } from '../../data/content'

export default function ExperienceApp() {
  return (
    <div className="p-6 pb-8 flex flex-col gap-0">
      {experiences.map((exp, idx) => (
        <div key={exp.id} className="flex gap-4">
          {/* Timeline spine */}
          <div className="flex flex-col items-center" style={{ width: 36 }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{
                background: 'rgba(167,139,250,0.2)',
                border: '2px solid rgba(167,139,250,0.5)',
              }}
            >
              {exp.emoji}
            </div>
            {idx < experiences.length - 1 && (
              <div
                className="flex-1 w-0.5 my-1"
                style={{ background: 'rgba(255,255,255,0.1)', minHeight: 24 }}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-1 mb-2">
              <div>
                <h3 className="text-white font-semibold text-base">{exp.role}</h3>
                <p className="text-purple-300 text-sm font-medium">{exp.company}</p>
              </div>
              <div className="text-right">
                <span className="text-white/50 text-xs block">{exp.period}</span>
                <span className="text-white/40 text-xs block">{exp.location}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5">
              {exp.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/70 leading-relaxed">
                  <span className="mt-0.5 shrink-0" style={{ color: '#a78bfa' }}>▸</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}
