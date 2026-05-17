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
  logoSrc?: string
  /**
   * Optional path to a banner image (relative to /public). When omitted or the
   * file is missing, the card falls back to a gradient built from `accent`.
   * Drop files into `public/projects/<id>.png` to enable.
   */
  bannerImage?: string
  /**
   * CSS `object-position` for the banner image (with `object-fit: cover`).
   * Use e.g. `left center`, `62% center`, or `38% center` to nudge framing per asset.
   */
  bannerObjectPosition?: string
  /** Zoom banner image (1 = default). Pairs with `object-fit: cover`; parent clips overflow. */
  bannerImageScale?: number
  /** Origin for banner scale, e.g. `center 60%` to bias zoom toward lower frame. */
  bannerImageTransformOrigin?: string
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
  logoSrc?: string
  /** If set, shows a “Learn more” link (app accent) with an external-link icon. */
  learnMoreUrl?: string
}

export const projects: Project[] = [
  {
    id: 'orsus-health',
    name: 'OrsusHealth',
    tagline: 'Heart disease prediction',
    description:
      'Heart disease prediction stack with probabilistic models, serverless inference, and an agent layer for richer, patient-aware context.\n\n• Trained multiple probabilistic machine learning models including Logistic Regression and Random Forest models for heart disease prediction to improve ROC-AUC score to 0.95 and accuracy to 89%\n• Integrated AWS Lambda to host the model and provide real-time predictions with FastAPI in under 10 seconds\n• Designed an AI agent using LangChain to equip the model with a clinical facts database and patient profiles by integrating MCP tool calls to provide realistic, user-centric data to improve heart health',
    tags: ['Scikit-learn', 'AWS', 'PostgreSQL', 'React', 'FastAPI', 'LangChain'],
    githubUrl: 'https://github.com/JeremySiu/OrsusHealth',
    liveUrl: 'https://orsus-health.vercel.app/',
    emoji: '🫀',
    bannerImage: '/projects/OrsusHealth.png',
    bannerObjectPosition: '40% center',
    accent: { from: '#dc2626', to: '#7f1d1d' },
  },
  {
    id: 'callio-labs',
    name: 'Callio Labs',
    tagline: 'Agentic genome research (Winner @ GenAI Genesis)',
    description:
      'Agentic genomics research platform combining MCP tool calls, NCBI datasets, primer design, and ColabFold for structure prediction.\n\n• Developed an agentic AI pipeline equipped with MCP tools calls, NCBI Datasets, and Primer3 APIs to run 5+ parallelized tests to determine optimal primer sequences, significantly reducing research time\n• Awarded the Best Health Care Hack using Agentic AI and Top 5 Project among 249 projects and over 800 participants',
    tags: ['LangFlow', 'FastMCP', 'ColabFold', 'FastAPI', 'Next.js', 'LangChain'],
    githubUrl: 'https://github.com/MarcDasilva/Callio_Labs',
    liveUrl: 'https://callio-labs.vercel.app/',
    emoji: '🧬',
    bannerImage: '/projects/callio_labs.png',
    bannerObjectPosition: 'center bottom',
    accent: { from: '#0d9488', to: '#134e4a' },
  },
  {
    id: 'forecast',
    name: 'Forecast',
    tagline: 'Data automation platform (Winner @ FCI Hackathon)',
    description:
      'Automation platform for the Future Cities Institute Vision One Million scorecard — ingestion, scoring, and explainable AI over civic datasets.\n\n• Designed an AI centric pipeline to extract data for Waterloo\'s readiness for a population of 1 million by developing a RAG pipeline to calculate a composite score against 50+ benchmarks and relations to each of the 5 categories\n• Automated data collection with Playwright and recorded web scraping sessions for data validation and user transparency\n• Awarded $2000 for Best Technical use of LangChain among 46 projects and 128 participants',
    tags: ['LangChain', 'Playwright', 'FastAPI', 'PostgreSQL', 'Next.js'],
    githubUrl: 'https://github.com/MarcDasilva/Forecast',
    liveUrl: 'https://forecast-fci.vercel.app/',
    emoji: '📊',
    bannerImage: '/projects/Forecast.png',
    bannerObjectPosition: 'left center',
    accent: { from: '#2563eb', to: '#1e3a8a' },
  },
  {
    id: 'avesia',
    name: 'Avesia',
    tagline: 'Making cameras smart (Winner @ NexHacks)',
    description:
      'No-code AI surveillance workflow builder for custom computer vision pipelines, triggers, and automated alerts.\n\n• Built a no-code AI surveillance workflow builder for creating custom CV detection pipelines, event triggers, and automated alert flows winning 1st place among 874 participants and 100+ projects\n• Implemented Python CV pipelines with Overshoot and OpenCV to achieve 95% recognition with live camera feeds\n• Improved reliability with motion-based throttling and detection validation, reducing false alarms and unnecessary AI calls',
    tags: ['Overshoot SDK', 'React Flow', 'Gemini API', 'FastAPI', 'React', 'MongoDB'],
    githubUrl: 'https://github.com/MarcDasilva/avesia',
    emoji: '📷',
    bannerImage: '/projects/avesia.png',
    accent: { from: '#7c3aed', to: '#4c1d95' },
  },
  {
    id: 'compass',
    name: 'Compass',
    tagline: 'See insights clearer (Winner @ QHacks)',
    description:
      'Full-stack analytics and RAG over large municipal service-request corpora with voice-forward AI interaction.\n\n• Engineered a custom RAG pipeline using pgvector, Gemini, and sentence-transformers to identify hidden relations between 137,000+ service requests to simultaneously solve pressing issues and reduce data processing time\n• Integrated Gradium and Gemini API for animated text-to-speech for easy interaction with real-time AI analysis\n• Deployed a cloud-hosted FastAPI backend on Vultr to automate daily batch retrieval of 1,000,000+ records with cron jobs',
    tags: ['PostgreSQL', 'Gradium API', 'Rive', 'Gemini', 'FastAPI', 'Next.js'],
    githubUrl: 'https://github.com/MarcDasilva/Compass',
    liveUrl: 'https://compass-queens.vercel.app/',
    emoji: '🧭',
    bannerImage: '/projects/compass.png',
    bannerObjectPosition: '26% center',
    accent: { from: '#ea580c', to: '#9a3412' },
  },
  {
    id: 'parkinsons-voice-detection',
    name: "Parkinson's voice detection",
    tagline: 'ML on vocal biomarkers',
    description:
      'Predictive pipeline for Parkinson\'s disease from voice recordings using classical ML on jitter, shimmer, HNR, and related features.\n\n• Engineered a predictive pipeline to detect Parkinson\'s disease from patient voice recordings using Support Vector Machines (SVM), achieving 95% balanced accuracy with high recall for early clinical relevance\n• Optimized model hyperparameters with GridSearchCV, boosting overall accuracy by 17% and eliminating false positives, demonstrating the potential for non-invasive, voice-based diagnostic tools',
    tags: ['Scikit-learn', 'Pandas', 'NumPy', 'Seaborn', 'Jupyter'],
    githubUrl: 'https://github.com/JeremySiu/parkinsons-voice-detection',
    emoji: '🎙️',
    bannerImage: '/projects/parkinsons_disease.png',
    bannerObjectPosition: 'center 94%',
    bannerImageScale: 1.22,
    bannerImageTransformOrigin: 'center 78%',
    accent: { from: '#0891b2', to: '#164e63' },
  },
]

export const skillCategories: SkillCategory[] = [
  {
    name: 'Languages',
    skills: ['C/C++', 'Javascript', 'TypeScript', 'Python', 'HTML', 'CSS/SCSS', 'Bash', 'SQL'],
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
    id: 'eccc-ml',
    role: 'Applied Machine Learning Engineer',
    company: 'Government of Canada (Environment and Climate Change Canada)',
    period: 'Jan 2026 – Apr 2026',
    location: 'Toronto, ON',
    emoji: '☁️',
    logoSrc: 'https://vectorlogoseek.com/wp-content/uploads/2019/06/government-of-canada-vector-logo.png',
    bullets: [
      'Developed 3+ hail forecasting models by designing ConvLSTM, U-Net, and Transformer deep learning architectures to improve baseline model accuracy by 33.7% and improve ROC-AUC by over 20%.',
      'Engineered a GCP analytics pipeline for Random Forest and XGBoost cloud classifiers, increasing efficiency by 97% and saving $6000+ annually.',
      'Reduced classifier size by 190× from 3.8GB to 20MB by replacing Random Forest with XGBoost for portable deployment.',
      'Implemented Optical Flow methods to validate cloud convection forecasting, reducing $4000+ in verification costs.',
      'Saved an estimated $27,684 in staffing costs by independently delivering 3 ML projects beyond the original project scope.',
    ],
  },
  {
    id: 'wiz-fe-ux',
    role: 'Front End Engineer & UX Designer',
    company: 'Wiz Robotics',
    period: 'May 2025 – Aug 2025',
    location: 'Richmond Hill, ON',
    emoji: '⚛️',
    logoSrc: 'https://entrepreneurs.utoronto.ca/wp-content/uploads/2023/08/wizrobotics_logo.jpg',
    bullets: [
      'Built React frameworks with reusable component libraries to create Escape Room and Flash Card content 3× faster.',
      'Refactored 50+ CSS files into a modular SCSS structure, eliminating cascade conflicts across 30+ components, improving maintainability and reducing front-end technical debt by 20%.',
      'Designed and implemented an end-to-end testing workflow using Playwright, standardizing test creation for the development team, mitigating 100+ edge case errors across interactive React components.',
      'Converted React projects into teachable curriculum, securing adoption by FIRST Robotics and reaching 500+ educators.',
    ],
  },
  {
    id: 'wiz-instructor',
    role: 'Python and Arduino Instructor',
    company: 'Wiz Robotics',
    period: 'May 2025 – Dec 2025',
    location: 'Richmond Hill, ON',
    emoji: '🐍',
    logoSrc: 'https://entrepreneurs.utoronto.ca/wp-content/uploads/2023/08/wizrobotics_logo.jpg',
    bullets: [
      'Mentored 50+ students in Python with hands-on projects and customized lessons to improve technical skills and confidence.',
      'Guided students in completing embedded software final projects, integrating Arduino, sensors, and hardware control systems.',
    ],
  },
  {
    id: 'sickkids-nephrology',
    role: 'Nephrology Research Volunteer',
    company: 'SickKids Hospital',
    period: 'Jun 2024 – Aug 2024',
    location: 'Toronto, ON',
    emoji: '🏥',
    logoSrc: 'https://wisefamilyfoundation.org/wp-content/uploads/2021/02/SickKids_logo_2col.png',
    bullets: [
      'Digitized and organized 500+ patient data files to analyze the correlation between chemotherapy and acute kidney disease, contributing to the development of a predictive model for kidney disease in childhood cancer patients.',
      'Collaborated with the nephrology research team to organize and analyze physical patient files, enhancing team productivity by 25% and ensuring the accurate and timely processing of patient data for ongoing studies.',
      'Prepared materials for 100+ centrifugation and urine sample collections, supporting critical research activities.',
    ],
  },
]
