import { projects } from '../../data/content'

export default function ProjectsApp() {
  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01]"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{project.emoji}</span>
            <div>
              <h3 className="text-white font-semibold text-base">{project.name}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm leading-relaxed flex-1">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(167,139,250,0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(167,139,250,0.3)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="flex gap-3 mt-1">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                <span>⬡</span> GitHub
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                <span>↗</span> Live
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
