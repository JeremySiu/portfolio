export interface Project {
  id: string
  name: string
  /** Short one-liner shown under the card on the projects grid. */
  tagline: string
  /** Long description shown on the project detail page. */
  description: string
  tags: string[]
  githubUrl?: string
  liveUrl?: string
  emoji: string
  /**
   * Optional path to a banner image (relative to /public). When omitted or the
   * file is missing, the card falls back to a gradient built from `accent`.
   * Drop files into `public/projects/<id>.png` to enable.
   */
  bannerImage?: string
  /** Accent colour used for the gradient fallback banner and detail header. */
  accent: { from: string; to: string }
}

export interface SkillCategory {
  name: string
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
  /** If set, shows an orange “Learn more” link with an external-link icon. */
  learnMoreUrl?: string
}

export const projects: Project[] = [
  {
    id: 'devflow',
    name: 'DevFlow',
    tagline: 'Real-time collaborative code editor',
    description:
      'DevFlow is a real-time collaborative code editor with syntax highlighting, live cursors, and integrated AI code suggestions powered by GPT-4.\n\nBuilt around low-latency presence, conflict-free editing, and an extensible plugin system so teams can pair-program from anywhere without losing flow.',
    tags: ['React', 'TypeScript', 'Node.js', 'WebSockets', 'OpenAI'],
    githubUrl: 'https://github.com',
    liveUrl: 'https://example.com',
    emoji: '⚡',
    bannerImage: '/projects/devflow.png',
    accent: { from: '#fbbf24', to: '#ef4444' },
  },
  {
    id: 'cloudvault',
    name: 'CloudVault',
    tagline: 'End-to-end encrypted file storage',
    description:
      'CloudVault is an end-to-end encrypted file storage service with client-side encryption, folder sharing, and versioning. It handles 10k+ daily active users.\n\nDesigned around zero-trust security, fast resumable uploads, and a clean sharing model that keeps encryption keys on the client at all times.',
    tags: ['Next.js', 'PostgreSQL', 'AWS S3', 'Docker', 'Redis'],
    githubUrl: 'https://github.com',
    liveUrl: 'https://example.com',
    emoji: '🔒',
    bannerImage: '/projects/cloudvault.png',
    accent: { from: '#60a5fa', to: '#7c3aed' },
  },
  {
    id: 'pulsemetrics',
    name: 'PulseMetrics',
    tagline: 'Real-time analytics dashboard',
    description:
      'PulseMetrics is a lightweight analytics dashboard that ingests event streams, aggregates KPIs in real time, and renders interactive charts with drill-down support.\n\nThe pipeline is tuned for sub-second ingestion-to-visualisation latency, with a focus on observable, low-overhead instrumentation.',
    tags: ['Python', 'FastAPI', 'Kafka', 'ClickHouse', 'D3.js'],
    githubUrl: 'https://github.com',
    emoji: '📊',
    bannerImage: '/projects/pulsemetrics.png',
    accent: { from: '#22d3ee', to: '#0ea5e9' },
  },
  {
    id: 'notionclone',
    name: 'NoteSpace',
    tagline: 'Block-based note-taking app',
    description:
      'NoteSpace is a block-based note-taking app with a drag-and-drop editor, nested pages, slash commands, and offline sync via CRDTs.\n\nLocal-first by design — every edit persists instantly to IndexedDB and merges cleanly across devices, even after long stretches offline.',
    tags: ['React', 'TypeScript', 'Yjs', 'IndexedDB', 'Tailwind'],
    githubUrl: 'https://github.com',
    liveUrl: 'https://example.com',
    emoji: '📝',
    bannerImage: '/projects/notionclone.png',
    accent: { from: '#a78bfa', to: '#ec4899' },
  },
]

export const skillCategories: SkillCategory[] = [
  {
    name: 'Languages',
    skills: ['C/C++', 'Javascript', 'Python', 'HTML', 'CSS/SCSS', 'Bash', 'SQL'],
  },
  {
    name: 'Frameworks/Libraries',
    skills: [
      'React',
      'Node.js',
      'Vite',
      'Playwright',
      'scikit-learn',
      'Pytorch',
      'Pandas',
      'NumPy',
      'LangChain',
      'Pytest',
    ],
  },
  {
    name: 'Technologies',
    skills: [
      'Linux',
      'Git',
      'VS Code',
      'Cursor',
      'Google Cloud',
      'AWS',
      'PostgreSQL',
      'Supabase',
      'OAuth',
      'Jupyter',
      'MATLAB',
      'Figma',
      'Arduino',
    ],
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
