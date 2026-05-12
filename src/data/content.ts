export interface Project {
  id: string
  name: string
  description: string
  tags: string[]
  githubUrl?: string
  liveUrl?: string
  emoji: string
}

export interface SkillCategory {
  name: string
  emoji: string
  skills: string[]
}

export interface Experience {
  id: string
  role: string
  company: string
  period: string
  location: string
  bullets: string[]
  emoji: string
}

export const projects: Project[] = [
  {
    id: 'devflow',
    name: 'DevFlow',
    description: 'A real-time collaborative code editor with syntax highlighting, live cursors, and integrated AI code suggestions powered by GPT-4.',
    tags: ['React', 'TypeScript', 'Node.js', 'WebSockets', 'OpenAI'],
    githubUrl: 'https://github.com',
    liveUrl: 'https://example.com',
    emoji: '⚡',
  },
  {
    id: 'cloudvault',
    name: 'CloudVault',
    description: 'End-to-end encrypted file storage service with client-side encryption, folder sharing, and versioning. Handles 10k+ daily active users.',
    tags: ['Next.js', 'PostgreSQL', 'AWS S3', 'Docker', 'Redis'],
    githubUrl: 'https://github.com',
    liveUrl: 'https://example.com',
    emoji: '🔒',
  },
  {
    id: 'pulsemetrics',
    name: 'PulseMetrics',
    description: 'Lightweight analytics dashboard that ingests event streams, aggregates KPIs in real time, and renders interactive charts with drill-down support.',
    tags: ['Python', 'FastAPI', 'Kafka', 'ClickHouse', 'D3.js'],
    githubUrl: 'https://github.com',
    emoji: '📊',
  },
  {
    id: 'notionclone',
    name: 'NoteSpace',
    description: 'Block-based note-taking app with drag-and-drop editor, nested pages, slash commands, and offline sync via CRDTs.',
    tags: ['React', 'TypeScript', 'Yjs', 'IndexedDB', 'Tailwind'],
    githubUrl: 'https://github.com',
    liveUrl: 'https://example.com',
    emoji: '📝',
  },
]

export const skillCategories: SkillCategory[] = [
  {
    name: 'Languages',
    emoji: '💬',
    skills: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL', 'Rust'],
  },
  {
    name: 'Frontend',
    emoji: '🎨',
    skills: ['React', 'Next.js', 'Tailwind CSS', 'Framer Motion', 'D3.js', 'Vite'],
  },
  {
    name: 'Backend',
    emoji: '⚙️',
    skills: ['Node.js', 'FastAPI', 'GraphQL', 'REST APIs', 'WebSockets', 'gRPC'],
  },
  {
    name: 'Databases',
    emoji: '🗄️',
    skills: ['PostgreSQL', 'MongoDB', 'Redis', 'ClickHouse', 'Prisma', 'SQLite'],
  },
  {
    name: 'Cloud & DevOps',
    emoji: '☁️',
    skills: ['AWS', 'Docker', 'Kubernetes', 'GitHub Actions', 'Terraform', 'Vercel'],
  },
  {
    name: 'Tools',
    emoji: '🛠️',
    skills: ['Git', 'VS Code', 'Figma', 'Linear', 'Datadog', 'Postman'],
  },
]

export const experiences: Experience[] = [
  {
    id: 'swe2',
    role: 'Software Engineer II',
    company: 'Acme Corp',
    period: '2023 – Present',
    location: 'San Francisco, CA',
    emoji: '🚀',
    bullets: [
      'Led migration of monolith to microservices, reducing p99 latency by 40%.',
      'Architected real-time notification system handling 2M+ events/day using Kafka and WebSockets.',
      'Mentored 3 junior engineers through design reviews and pair programming sessions.',
      'Shipped React component library used across 6 product teams, cutting UI dev time by 30%.',
    ],
  },
  {
    id: 'swe1',
    role: 'Software Engineer I',
    company: 'Startup XYZ',
    period: '2021 – 2023',
    location: 'Remote',
    emoji: '💡',
    bullets: [
      'Built customer-facing dashboard with Next.js and TypeScript, improving user retention by 18%.',
      'Designed and implemented RESTful API for payments integration with Stripe.',
      'Reduced CI pipeline time from 22 min to 8 min by parallelizing test suites.',
      'Contributed 40+ OSS pull requests to libraries used in production.',
    ],
  },
  {
    id: 'intern',
    role: 'Software Engineering Intern',
    company: 'Big Tech Co',
    period: 'Summer 2020',
    location: 'Seattle, WA',
    emoji: '🌱',
    bullets: [
      'Delivered internal tooling feature for 500+ employee productivity suite on schedule.',
      'Wrote end-to-end test suite covering critical user flows, catching 12 regression bugs.',
      'Presented demo to VP of Engineering, resulting in full-time return offer.',
    ],
  },
]
