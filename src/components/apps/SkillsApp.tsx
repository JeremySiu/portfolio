import { skillCategories } from '../../data/content'

export default function SkillsApp() {
  return (
    <div className="p-6 pb-8 flex flex-col gap-6">
      {skillCategories.map((category) => (
        <div key={category.name}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{category.emoji}</span>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">
              {category.name}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {category.skills.map((skill) => (
              <span
                key={skill}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
