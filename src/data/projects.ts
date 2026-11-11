export type Domain = 'research' | 'agents' | 'sensing' | 'products' | 'team';

export interface DomainInfo {
  id: Domain;
  label: string;
  short: string;
  color: string;
  blurb: string;
}

export const DOMAINS: DomainInfo[] = [
  { id: 'research', label: 'Research', short: 'RES', color: '#a78bfa', blurb: 'Studies on retrieval, search and the security of code written by LLMs.' },
  { id: 'agents', label: 'Agent Safety', short: 'SAFE', color: '#22d3ee', blurb: 'Tools that watch and limit what AI agents do.' },
  { id: 'sensing', label: 'Sensing & Hardware', short: 'SENSE', color: '#fbbf24', blurb: 'ESP32 boards, Wi-Fi signals, satellites and microphones.' },
  { id: 'products', label: 'Apps', short: 'APP', color: '#34d399', blurb: 'Full-stack apps, from the model to the interface.' },
  { id: 'team', label: 'Team builds', short: 'TEAM', color: '#f472b6', blurb: 'Hackathon and team projects I contributed code to.' },
];

export const domainById = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<Domain, DomainInfo>;

export interface Metric {
  value: string;
  label: string;
}

export interface Project {
  slug: string;
  name: string;
  repo: string;
  domain: Domain;
  /** One plain sentence: what it is. */
  tagline: string;
  /** How it works, in two or three sentences. */
  description: string;
  /** What I did. For solo projects this is omitted. */
  role?: string;
  stack: string[];
  metrics?: Metric[];
  live?: { label: string; url: string };
  /** A real screenshot or results figure from the repo, in public/work/. */
  image?: { src: string; caption: string; illustration?: boolean };
  /** Where my own code lives when it is on a branch of someone else's repo. */
  branch?: { label: string; url: string };
  context?: string;
  status?: string;
  featured?: boolean;
}

const gh = (r: string) => `https://github.com/sudarsan2507-hue/${r}`;

export const PROJECTS: Project[] = [
  // ---------------- Research ----------------
  {
    slug: 'glass-armor', name: 'Glass Armor', repo: gh('GLASS-ARMOR'), domain: 'research', featured: true,
    image: { src: 'glass-armor-2.webp', caption: 'Repair results: with test feedback the model fixed 0 of 31 insecure outputs; with Glass Armor’s gate feedback it fixed 10.' },
    tagline: 'I tested whether LLMs can safely move code to post-quantum cryptography. Often they can’t.',
    description:
      'I built a benchmark of 20 Python programs with 77 flawed migrations that still pass every test, ran 400 migrations across 4 models, and wrote a security gate (Semgrep rules, AST dataflow and live probes). With the gate’s feedback, a capable model fixed flaws that test feedback never caught.',
    stack: ['Python', 'liboqs', 'ML-KEM', 'ML-DSA', 'Semgrep', 'statsmodels'],
    metrics: [
      { value: '0/71', label: 'planted flaws caught by the tests' },
      { value: '26/84', label: 'working AI migrations that were insecure' },
      { value: '400', label: 'migrations measured' },
    ],
  },
  {
    slug: 'graderag', name: 'GradeRAG', repo: gh('GradeRAG'), domain: 'research', featured: true,
    image: { src: 'graderag.webp', caption: 'Accuracy, mistake-avoidance rate and improvement over standard RAG, across three models and two datasets.' },
    context: 'NLP research internship · NIT Trichy · May to July 2026',
    tagline: 'A RAG pipeline that remembers its wrong answers and avoids repeating them.',
    description:
      'Full title: Retrieval-Augmented Generation with Persistent Mistake Knowledge Graph for Cross-Question Failure Learning. Each wrong answer is labelled (retrieval or reasoning failure) and stored in a Mistake Knowledge Graph. For a new question, similar past mistakes are retrieved as warnings. I tested it on HotpotQA and TriviaQA with three models. The paper is under review, so only the results are public for now.',
    stack: ['RAG', 'FAISS', 'MiniLM', 'Knowledge graphs', 'HotpotQA', 'TriviaQA'],
    metrics: [
      { value: '+29.5', label: 'points exact match, GPT-4o-mini on HotpotQA' },
      { value: '87.5%', label: 'accuracy, up from 58.0%' },
      { value: '5/6', label: 'model and dataset pairs improved' },
    ],
    live: { label: 'Explore the graph', url: 'https://sudarsan2507-hue.github.io/GradeRAG/mkg-explorer.html' },
  },
  {
    slug: 'demosearch', name: 'DemoSearch', repo: gh('DemoSearch'), domain: 'research', featured: true,
    image: { src: 'demosearch.webp', caption: 'How much a diagnosed failure helps as mistakes surface later in the search.' },
    tagline: 'A study of when telling a search agent about its failures actually helps.',
    description:
      'It began as Failure-Aware Graph Search and grew into experiments on synthetic graphs, 295 hard Sudoku puzzles, MetaQA, WebQSP and LLM code repair on MBPP+. I wrote the hypotheses down before each run. The main finding: a failure helps only when it comes with a reason.',
    stack: ['Python', 'Graph search', 'BGE embeddings', 'Groq', 'SciPy'],
    metrics: [
      { value: '2.5-3.3×', label: 'more code repaired when the model is told why a test failed' },
      { value: '5', label: 'task families tested' },
    ],
  },
  {
    slug: 'iaudit', name: 'iAudit', repo: gh('iAudit'), domain: 'research', featured: true,
    image: { src: 'iaudit.webp', caption: 'Brain-age bias after correction, by sex and by scanner site, for DeepBrainNet and two tabular models.' },
    tagline: 'A fairness audit of models that estimate age from brain MRI.',
    description:
      'I compared DeepBrainNet, a CNN on raw T1 MRI, with three simple models on brain-volume features, to see whether the errors for some groups come from the scanner or from the model. There is a demo site with 26 real cases.',
    stack: ['TensorFlow', 'ANTsPyNet', 'XGBoost', 'statsmodels', 'nibabel'],
    metrics: [
      { value: '560', label: 'MRI scans in the full run' },
      { value: '26', label: 'real cases in the demo' },
    ],
  },
  {
    slug: 'basesvm', name: 'BaseSVM', repo: gh('BaseSVM'), domain: 'research',
    image: { src: 'basesvm-art.webp', caption: 'A linear SVM separating two classes with a maximum-margin boundary.', illustration: true },
    tagline: 'A linear support vector machine written from scratch, with no libraries.',
    description: 'It trains with hinge loss and L2 regularization by sub-gradient descent and explains every weight update. On the included data it finds the pass/fail boundary at about 4.4 hours of study.',
    stack: ['Python'],
  },
  {
    slug: 'fea-sweep', name: 'Parametric FEA Sweep', repo: gh('parametric-fea-sweep'), domain: 'research', status: 'In progress',
    image: { src: 'fea-sweep-art.webp', caption: 'The planned analysis: stress along a loaded cantilever beam.', illustration: true },
    tagline: 'Automated stress analysis of a cantilever beam, checked against beam theory.',
    description: 'The plan: build the beam in FreeCAD, solve it with CalculiX, refine the mesh until results change by less than 1%, then sweep length, cross-section and load. The folder structure is in place; the model and scripts are next.',
    stack: ['FreeCAD', 'CalculiX', 'Python'],
  },

  // ---------------- Agent safety ----------------
  {
    slug: 'choketap', name: 'Choketap', repo: gh('ChokeTap'), domain: 'agents', featured: true,
    image: { src: 'choketap.webp', caption: 'Containment benchmark: no attacks got through, and what each check cost legitimate work.' },
    tagline: 'A checkpoint that every tool call from an AI agent must pass before it runs.',
    description:
      'It sits between a Gemma agent and its tools and checks three things: is the tool allowed, did the data come from an untrusted document, and does the action match what the user asked. Even when a prompt injection gets into the agent, it can’t send data anywhere the user didn’t name.',
    stack: ['Python', 'Gemma', 'pydantic', 'SQLite', 'Docker sandbox'],
    metrics: [
      { value: '0.06 ms', label: 'to block a call outside the allowed scope' },
      { value: '3', label: 'layers of checks' },
    ],
  },
  {
    slug: 'sentinelmind', name: 'SentinelMind', repo: gh('Sentinel_Mind'), domain: 'agents', featured: true,
    image: { src: 'sentinelmind.webp', caption: 'The live dashboard on a 12-step agent run: timeline, verdict mix, latency and reasons.' },
    tagline: 'A second AI that watches an agent while it runs and flags its mistakes.',
    description:
      'Every step gets a verdict (OK, warning or anomaly) with a short reason. It catches tools that don’t exist, repeated calls, drifting away from the goal and errors the agent ignored. Mistakes are saved and given back to the agent on its next run. You add it with one decorator.',
    stack: ['Python', 'Flask-SocketIO', 'Groq', 'React'],
    metrics: [{ value: '4', label: 'kinds of failure caught live' }],
  },
  {
    slug: 'engram', name: 'Engram', repo: gh('Engram'), domain: 'agents', featured: true,
    image: { src: 'engram.webp', caption: 'The inspector: the warehouse as the robot’s memory sees it, with poisoned claims quarantined.' },
    tagline: 'Offline memory for AI agents on edge devices that can’t be poisoned through sync.',
    description:
      'Each device answers from its own Qdrant Edge store with no network. When devices sync, a screening step checks where each memory came from and whether it conflicts, and only verified memories are ever searched. The demo runs six poisoning attacks and checks that each one is stopped.',
    stack: ['Qdrant Edge', 'FastEmbed', 'PyNaCl', 'FastAPI', 'Docker'],
    metrics: [{ value: '6/6', label: 'poisoning attacks stopped in the demo' }],
  },
  {
    slug: 'webmcp-forge', name: 'WebMCP Forge', repo: gh('CockPit'), domain: 'agents',
    image: { src: 'webmcp-forge-art.webp', caption: 'Generated WebMCP tools, each checked and marked safe or unsafe.', illustration: true },
    context: 'WebMCP Challenge',
    tagline: 'Generates WebMCP tools for a web app, then tests which ones are safe for an agent.',
    description:
      'It reads an app’s routes and writes the tools, then scans them for instructions hidden in descriptions, personal data sent to third parties, and tools marked read-only that actually change data. Generated tools run through a gate that blocks cross-origin requests.',
    stack: ['Next.js 15', 'TypeScript', 'WebMCP', 'Tailwind'],
    metrics: [{ value: '3', label: 'safety checks, static and live' }],
  },

  // ---------------- Sensing & hardware ----------------
  {
    slug: 'wisp', name: 'WISP', repo: gh('WISP'), domain: 'sensing', featured: true,
    image: { src: 'wisp-art.webp', caption: 'How WISP works: two ESP32 boards watch Wi-Fi signals across a room; a fall shows up as a spike in channel amplitude.', illustration: true },
    tagline: 'Detects a person falling from changes in Wi-Fi signals, using two ESP32 boards.',
    description:
      'It reads Wi-Fi Channel State Information, scores it with an Isolation Forest and a small state machine, and raises an alert on a collapse. The goal is under one false alarm per week in a real home, because a fall detector that cries wolf gets switched off.',
    stack: ['ESP32', 'Wi-Fi CSI', 'Isolation Forest', 'SciPy', 'Flask'],
    metrics: [
      { value: '<1', label: 'false alarm per week (target)' },
      { value: '~$15', label: 'of hardware' },
    ],
  },
  {
    slug: 'hydrofuse', name: 'HydroFuse', repo: gh('HydroFuse'), domain: 'sensing', featured: true,
    image: { src: 'hydrofuse-2.webp', caption: 'The dashboard during a simulated leak: soil moisture, leak-band vibration and no rain.' },
    tagline: 'Finds underground water-pipe leaks by combining ground sensors with satellite data.',
    description:
      'ESP32-S3 nodes measure soil moisture, vibration and magnetic field. Sentinel-1 and 2, SMAP, a DEM and MODIS add the view from orbit. Wet ground alone could be rain, so a leak is flagged only when there is wet ground, vibration in the leak band and no rain.',
    stack: ['ESP32-S3', 'Google Earth Engine', 'XGBoost', 'SHAP', 'FastAPI', 'Folium'],
    metrics: [{ value: '5', label: 'satellite data sources' }],
  },
  {
    slug: 'syrinx', name: 'Syrinx', repo: gh('Syrinx'), domain: 'sensing', featured: true,
    image: { src: 'syrinx-art.webp', caption: 'Six vocal sounds, classified by an SVM on MFCC features, become media keys.', illustration: true },
    tagline: 'Controls music on a phone with sounds: shush to pause, whistle for louder.',
    description:
      'The laptop listens, detects when a sound starts, extracts MFCC features and classifies it with an SVM into six commands, then sends a media key to the phone. The link to the phone is swappable, so everything can be tested without hardware.',
    stack: ['librosa', 'MFCC', 'SVM', 'Bluetooth HID', 'Arduino'],
    metrics: [{ value: '6', label: 'sounds recognised' }],
  },
  {
    slug: 'safesignal', name: 'SafeSignal', repo: gh('Safe-Signal'), domain: 'sensing', featured: true,
    image: { src: 'safesignal.webp', caption: 'The start screen: what stays on the device, and the 10-second cancel.' },
    tagline: 'A web app that notices signs of distress and prepares an alert for people you trust.',
    description:
      'It watches for a hand signal, tension in your voice or sudden violent movement, all on the phone, with nothing uploaded. It writes the alert with your location and gives you 10 seconds to cancel. It never claims a message was sent when it can’t confirm it.',
    stack: ['React 19', 'MediaPipe', 'Meyda', 'Web Audio', 'Vite'],
    metrics: [{ value: '0', label: 'servers: everything runs on the device' }],
    live: { label: 'Open the app', url: 'https://safe-signal-pi.vercel.app/' },
  },

  // ---------------- Apps ----------------
  {
    slug: 'datepilot', name: 'DatePilot', repo: gh('DatePilot'), domain: 'products', featured: true,
    image: { src: 'datepilot-art.webp', caption: 'A plan for two: stops, budget and a rain backup, all inside one city.', illustration: true },
    tagline: 'Plans a date for two people in Chennai, Coimbatore or Madurai.',
    description:
      'Each person enters preferences privately and the app shows only what they share. An open-weight model reads taste and explains the picks; plain Python enforces budget, opening hours, diet, travel time and the city. Routes and weather come from free APIs.',
    stack: ['FastAPI', 'Gemma', 'React', 'OSRM', 'Open-Meteo'],
    live: { label: 'Live demo', url: 'https://datepilot.onrender.com' },
  },
  {
    slug: 'codeg', name: 'CoDeg', repo: gh('CoDeg'), domain: 'products', featured: true,
    image: { src: 'codeg.webp', caption: 'The duel lobby.' },
    tagline: 'A two-player coding duel where faster code hits harder.',
    description:
      'Both players get the same problem. The first correct solution lands a hit; run time scales the damage and low memory use gives armour. Code runs in a locked-down Docker sandbox with no network.',
    stack: ['Node.js', 'Socket.IO', 'React', 'Docker'],
  },
  {
    slug: 'phantomvoice', name: 'Phantom Voice', repo: gh('PhantomVoice'), domain: 'products',
    image: { src: 'phantomvoice-art.webp', caption: 'Say a commitment once; it comes back as a reminder before the deadline.', illustration: true },
    tagline: 'A voice assistant whose only job is making sure I don’t forget things.',
    description: 'I say a task out loud once, from my laptop or phone. An LLM works out what I committed to and when, and a reminder loop pushes it to my phone in time.',
    stack: ['FastAPI', 'LLMs', 'faster-whisper', 'SQLite', 'ntfy'],
  },
  {
    slug: 'studentfrndly', name: 'StudentFrndly', repo: gh('Student-frndly'), domain: 'products',
    image: { src: 'studentfrndly.webp', caption: 'The dashboard leads with the skill you are closest to forgetting.' },
    tagline: 'Tracks how fast you are forgetting each skill and tells you what to revise today.',
    description: 'Every skill fades on a half-life curve from the last time you practised it. Quick tests restore it, and a two-week forecast shows what will drop next. Includes Google sign-in and an admin view.',
    stack: ['Express', 'SQLite', 'React', 'JWT', 'Google OAuth'],
  },
  {
    slug: 'medsmart', name: 'Med-Smart', repo: gh('Med-Smart'), domain: 'products',
    image: { src: 'medsmart-art.webp', caption: 'Vitals are checked against safe ranges, and an alert goes to the caregiver.', illustration: true },
    tagline: 'A medication and health app for elderly people, their caregivers and doctors.',
    description: 'Doctors prescribe, elders log vitals, and readings outside safe ranges create alerts that n8n forwards by SMS, email or WhatsApp to the people linked to that elder.',
    stack: ['Flutter', 'Riverpod', 'Firebase', 'n8n'],
  },
  {
    slug: 'clas', name: 'CLAS', repo: gh('Personalised-Pedagogical-Assistant'), domain: 'products',
    image: { src: 'clas-art.webp', caption: 'The live teacher view: understanding, engagement and plagiarism per session.', illustration: true },
    tagline: 'A classroom tool that checks whether students understood, not just whether they attended.',
    description: 'Answers are scored in three stages: keyword coverage, a check for copied question text, then Llama 3.1 for real understanding and AI-written text. Teachers get a report with common misconceptions after each session. An earlier version lives in cognitive-attendance-system.',
    stack: ['Streamlit', 'scikit-learn', 'Groq', 'Plotly'],
  },
  {
    slug: 'smart-file-organizer', name: 'Smart File Organizer', repo: gh('smart-file-organizer'), domain: 'products',
    image: { src: 'smart-file-organizer-art.webp', caption: 'Files are read and sorted into folders by meaning; unsure ones go to Review.', illustration: true },
    tagline: 'Sorts the files in a folder by what they say, not just their extension.',
    description: 'It reads PDFs and documents, classifies them with keywords and sentence embeddings, sends unsure ones to a Review folder, and learns when you move a file. FAISS search lets you find files by meaning. Nothing leaves the computer.',
    stack: ['MiniLM', 'FAISS', 'watchdog', 'Ollama'],
  },
  {
    slug: 'yt-knowledge', name: 'YT Knowledge Assistant', repo: gh('yt-knowledge-assistant'), domain: 'products',
    image: { src: 'yt-knowledge-art.webp', caption: 'Ask a question about a video and get an answer with a timestamp.', illustration: true },
    tagline: 'Answers questions about a YouTube video from its transcript.',
    description: 'It uses captions when they exist and Whisper when they don’t, writes a structured summary, and answers questions using only that video’s content.',
    stack: ['FastAPI', 'Groq', 'Llama 3.3', 'FastEmbed'],
  },
  {
    slug: 'rag-browser', name: 'rag-browser-ai', repo: gh('rag-browser-ai'), domain: 'products',
    image: { src: 'rag-browser-art.webp', caption: 'Pages are fetched, cleaned, chunked and embedded, then answered with sources.', illustration: true },
    tagline: 'A RAG pipeline that searches the web itself before answering.',
    description: 'A visible Playwright browser searches, reads the top pages, and stores cleaned chunks in ChromaDB. A local Llama answers from those chunks and cites its sources. The knowledge base grows with every run.',
    stack: ['Playwright', 'ChromaDB', 'Ollama'],
  },
  {
    slug: 'club-management', name: 'Club Management System', repo: gh('Club-Management-System'), domain: 'products',
    image: { src: 'club-management.webp', caption: 'The admin dashboard.' },
    tagline: 'A club manager for members, events, attendance and funds, in plain JavaScript.',
    description: 'Built without frameworks: role-based login, member and event management, attendance, announcements and a fund tracker, all stored in the browser.',
    stack: ['HTML', 'CSS', 'JavaScript'],
  },
  {
    slug: 'cyber-glitch', name: 'Cyber//Glitch', repo: gh('Tundra-0727'), domain: 'products',
    image: { src: 'cyber-glitch.webp', caption: 'The threat-telemetry terminal page.' },
    tagline: 'A cybersecurity-themed landing page with glitch effects and animated telemetry.',
    description: 'A small React and Vite page with keyboard controls to start a scan, arm the glitch effect and reset.',
    stack: ['React', 'TypeScript', 'Vite'],
  },

  // ---------------- Team builds (I contributed code) ----------------
  {
    slug: 'aegis', name: 'Aegis AI', repo: gh('Aegis'), domain: 'agents', featured: true,
    image: { src: 'aegis.webp', caption: 'The command centre map, where scam, mule and counterfeit signals meet.' },
    context: 'Finalist · ET AI Hackathon 2026 · team of 4',
    tagline: 'Connects scam calls, money-mule accounts and fake currency into one case for the police.',
    description:
      'Our idea: these are three steps of the same criminal money trail. Four AI modules (scam-call NLP, a mule-account graph, counterfeit-note vision and a command centre) each produce evidence, and the platform joins them into one ranked lead.',
    role: 'I owned Fraud Shield: the scam classifier, warning markers, playbooks, the live-call monitor and the WhatsApp bot. I also built the supply-trail engine and the counterfeit serial-number check. 84 of 399 commits.',
    stack: ['Python', 'NLP', 'Twilio', 'Graph ML', 'Next.js'],
    metrics: [
      { value: 'Finalist', label: 'ET AI Hackathon 2026' },
      { value: '183', label: 'tests passing' },
      { value: '31', label: 'API endpoints' },
    ],
  },
  {
    slug: 'spatialauth', name: 'spatialAuth', repo: gh('spatialAuth'), domain: 'team', featured: true,
    image: { src: 'spatialauth-art.webp', caption: 'The room’s Wi-Fi, sound and magnetic signature becomes the login key.', illustration: true },
    context: 'Winner · Hack-N-Droid 2.0 · VIT Chennai · March 2026',
    tagline: 'Logs you in only inside a room it recognises, using the room itself as the key.',
    description: 'Every room has its own mix of Wi-Fi signal strengths, sound reflections and magnetic readings. The Android app captures them as an 11-feature signature, and the backend decides whether the phone is in the registered room.',
    role: 'I built the authentication backend: a One-Class SVM trained for each enrolled room, a login that takes 5 samples and accepts when at least 3 match, and a FastAPI service for enrolling and checking rooms, later refactored to handle many rooms. It is on the feature/ml-backend branch of the team repo.',
    stack: ['One-Class SVM', 'scikit-learn', 'FastAPI', 'Kotlin', 'Android sensors'],
    metrics: [{ value: '1st', label: 'place, Hack-N-Droid 2.0' }],
    branch: { label: 'My code: feature/ml-backend', url: 'https://github.com/prayag-1771/spatialAuth/tree/feature/ml-backend' },
  },
  {
    slug: 'synapse-xr', name: 'Synapse XR', repo: gh('Synapse_XR'), domain: 'team',
    image: { src: 'synapse-xr-art.webp', caption: 'How the AR view works: the expert’s tracked hand is mirrored as a hologram over a part my YOLOv8 model has detected.', illustration: true },
    context: 'DevsHouse · GDG on Campus VIT Chennai',
    tagline: 'A remote expert guides a worker through AR, with holographic 3D hands.',
    description: 'The expert’s hand movements, from a webcam or an ESP32 glove, are streamed into the worker’s Unity AR view, with object detection and safety checks on top.',
    role: 'I owned the AI models: YOLOv8 Nano training, an LSTM to smooth hand motion, TFLite INT8 export, Gemini prompts for step checks, and the AR overlays in Unity.',
    stack: ['YOLOv8', 'LSTM', 'TFLite', 'Unity AR', 'Gemini'],
  },
  {
    slug: 'landroid', name: 'Landroid', repo: gh('Landroid'), domain: 'team',
    image: { src: 'landroid.webp', caption: 'An NDVI raster from the drone survey, used for the land health score.' },
    context: 'Birdscale × VIT Chennai · 2026',
    tagline: 'Turns drone survey data into land health, tree cover and land value on a map.',
    description: 'A Flutter app and FastAPI backend serve large GeoTIFF rasters as map tiles and combine them with soil, weather and map data from five free APIs.',
    role: 'I built the ML pipeline: an ARIMA trend model, raster validation and plant-zone scoring, and I replaced hard-coded rainfall and temperature with real API data in the health dashboard.',
    stack: ['FastAPI', 'ARIMA', 'rasterio', 'Flutter', 'MapLibre'],
  },
  {
    slug: 'showonce', name: 'ShowOnce', repo: gh('ShowOnce'), domain: 'team',
    image: { src: 'showonce-art.webp', caption: 'A wrong first patch fails verification, the checkpoint is restored, the second passes.', illustration: true },
    tagline: 'Show an agent a task once; it turns that into a checked, repeatable workflow.',
    description: 'A walkthrough becomes a workflow contract. Each step is traced and verified, and failures are recovered from saved checkpoints. The live demo takes an issue from Slack to Linear and closes it only when the test passes.',
    role: 'I wrote 24 of 43 commits: the Slack-to-Linear pipeline, encrypted secrets, a setup checker, offline tests and the recovery timeline view.',
    stack: ['Python', 'Slack API', 'Linear', 'pytest'],
  },
  {
    slug: 'codebase', name: 'CodeBase', repo: gh('CodeBase'), domain: 'team',
    image: { src: 'codebase-art.webp', caption: 'Ask where something is handled and get the files that matter.', illustration: true },
    tagline: 'Connect a GitHub repo and ask questions about its code.',
    description: 'A code-intelligence platform for understanding unfamiliar repositories: structure, search and dependencies, explained by an LLM.',
    role: 'I wrote 15 of 27 commits: GitHub authentication, clear rate-limit and error messages, request validation, and a dashboard drawn from the real GitHub data.',
    stack: ['TypeScript', 'Next.js', 'GitHub API'],
  },
  {
    slug: 'webmcp-codex', name: 'WebMCP Forge (Codex edition)', repo: gh('CockPit-Codex'), domain: 'team',
    image: { src: 'webmcp-codex-art.webp', caption: 'The same tool checks, run against a safe test target.', illustration: true },
    context: 'with fawaz_ah',
    tagline: 'A second version of WebMCP Forge that runs the agent against safe test targets.',
    description: 'Depending on the input, the agent runs against your own app, a mock built from an OpenAPI spec, or nothing at all for third-party sites.',
    role: 'I wrote 15 of 45 commits: the three execution tiers, the Prism mock target, the policy gate’s egress rules and the tests that cover them.',
    stack: ['Next.js', 'TypeScript', 'Prism', 'Netlify'],
  },
  {
    slug: 'weatherguard', name: 'WeatherGuard', repo: gh('SIH-137'), domain: 'team',
    image: { src: 'weatherguard-art.webp', caption: 'Weather risk around you, and the safest direction to move.', illustration: true },
    context: 'Smart India Hackathon · SIH-137',
    tagline: 'Shows the safest direction to move in extreme weather, and the nearest hospital or police station.',
    description: 'It reads the weather around you, works out which direction is safest, and finds shelters that way on a map.',
    role: 'I moved it to Vite, replaced Google Maps and OpenWeather with free key-less APIs, added a FastAPI prediction engine and set up GitHub Pages deployment.',
    stack: ['Vite', 'Leaflet', 'Open-Meteo', 'FastAPI'],
  },
  {
    slug: 'hawkeye', name: 'Hawkeye', repo: gh('Hawkeye'), domain: 'team',
    image: { src: 'hawkeye-art.webp', caption: 'Vision, audio and motion signals fused into one risk score.', illustration: true },
    tagline: 'Real-time safety monitoring from video, audio and crowd movement.',
    description: 'YOLO detects weapons, fire and falls, audio models detect gunshots and screams, and optical flow spots crowd panic. A fusion engine scores the risk and explains each alert with a replay and heatmap.',
    role: 'I pushed the initial codebase; the team built on it.',
    stack: ['YOLO', 'OpenCV', 'Librosa', 'FastAPI'],
  },
];

/** Repos I forked from friends and teammates and did not commit to. Listed for completeness, with credit. */
export const FORKS = [
  { name: 'UniTalks', repo: gh('amazon-first-commit'), by: 'Hazz-Y and team', what: 'Anonymous college-only social space over WebRTC' },
  { name: 'AI Health Dashboard', repo: gh('AI_HEALTHCARE_DASHBOARD'), by: 'Prayag Sharma', what: 'Heart rate from a phone camera plus a risk model' },
  { name: 'Donate ML backend', repo: gh('DONATE_ML_BACKENED'), by: 'Prayag Sharma', what: 'Razorpay payment server for donations' },
  { name: 'E<T>WIN', repo: gh('E-T-win'), by: 'Yeswanth Ram, Logesh', what: 'City policy simulation with graph neural networks' },
  { name: 'ClubHub', repo: gh('cluber'), by: 'Adharshan', what: 'Club management for VIT Chennai in React' },
  { name: 'Detectonet', repo: gh('DETECTONET'), by: 'Shriharish V', what: 'Finds pirated copies of sports media' },
  { name: 'RoyalCoders', repo: gh('RoyalCoders'), by: 'Jaaiwanth', what: 'Smart mechanic diagnostic dashboard' },
  { name: 'quiz-app', repo: gh('quiz-app'), by: 'Jaaiwanth', what: 'Quiz app in React' },
  { name: 'ytinov', repo: gh('ytinov'), by: 'Hari Balaji', what: 'Empty starter repo' },
];


export const LINKS = {
  github: 'https://github.com/sudarsan2507-hue',
  linkedin: 'https://www.linkedin.com/in/sudarsan-ravichandran-82b209391',
  kaggle: 'https://www.kaggle.com/sudarsan007r',
  ieee: 'https://ieeexplore.ieee.org/author/607201746740566',
};

export const PUBLICATION = {
  title: 'Investigation of Interface Trap Charges on Schottky TFET for High-Frequency Application',
  venue: '2026 IEEE 6th International Conference',
  publisher: 'IEEE Xplore',
  url: 'https://ieeexplore.ieee.org/document/11610552',
  authors: ['Prayag Sharma', 'Sudarsan Ravichandran', 'Veer Vikram Saxena', 'Prashanth Kumar', 'Ravi Tiwari'],
  summary:
    'Schottky tunnel FETs replace a doped source with a metal-semiconductor Schottky junction, so carriers enter the channel by field emission and band-to-band tunnelling across a thin barrier. That gives very low OFF-state leakage and a sub-60 mV/decade subthreshold swing. This paper studies how charges trapped at the gate-oxide interface change that behaviour for high-frequency use.',
  topics: ['Schottky TFET', 'Band-to-band tunnelling', 'Interface trap charges', 'Gate dielectric', 'Harmonic distortion', 'High-frequency analysis'],
};

export const DATASET = {
  title: 'Skin Cancer Images: ISIC 2019 Preprocessed',
  url: 'https://www.kaggle.com/datasets/sudarsan007r/isic-2019-preprocessed-leakage-free-split',
  doi: 'https://doi.org/10.34740/kaggle/dsv/20910302',
  summary:
    'Many ISIC photos show the same lesion more than once, so a random split puts one lesion in both train and test and inflates the score. This version splits by lesion with StratifiedGroupKFold, so no lesion appears in two splits. Every image is cleaned, resized to 224×224 and ships with a lesion mask.',
  metrics: [
    { value: '25,331', label: 'dermoscopy images, 8 classes' },
    { value: '0', label: 'lesions shared across splits' },
    { value: '0.3 GB', label: 'down from 9.1 GB' },
  ],
  split: [
    { name: 'train', count: '20,308' },
    { name: 'val', count: '2,448' },
    { name: 'test', count: '2,575' },
  ],
  pipeline: ['Non-Local Means denoise', 'Shades-of-Gray colour', 'CLAHE contrast', 'Crop to 224×224', 'DullRazor hair removal', 'Otsu lesion masks'],
};

/** My second Kaggle dataset. Details beyond the title and link are kept to what iAudit already documents. */
export const DATASET2 = {
  title: 'IXI T1 Brain MRI, Preprocessed for Brain Age',
  short: 'IXI T1 brain MRI',
  url: 'https://www.kaggle.com/datasets/sudarsan007r/ixi-t1-brain-mri-preprocessed-brain-age',
  doi: 'https://doi.org/10.34740/kaggle/dsv/21848925',
  doiLabel: '10.34740/kaggle/dsv/21848925',
  notebook: 'https://www.kaggle.com/code/sudarsan007r/brain-age-from-mri-complete-starter-ixi-t1',
  code: 'https://github.com/sudarsan2507-hue/iAudit',
  licence: 'CC BY-SA 3.0',
  summary:
    'The raw IXI scans are whole heads in mixed orientations, with no labels file. This version has 492 T1 scans, one per person, already skull-stripped and registered to the same template, with age, sex, site and scanner in one labels file. They are the Guys and HH scans that went through the BrainAgeNeXt part of iAudit, my fairness audit of brain-age models.',
  metrics: [
    { value: '492', label: 'scans, one per person (Guys 312, HH 180)' },
    { value: '182 × 218 × 182', label: 'voxels at 1 mm, MNI152 space' },
    { value: '3.4 GB', label: 'download, 14 GB unpacked' },
  ],
  split: [
    { name: 'train', count: '393' },
    { name: 'val', count: '49' },
    { name: 'test', count: '50' },
  ],
  splitNote: 'Split by subject and stratified by age decade, so nobody appears in two splits.',
  pipeline: [
    'Intensity truncated at the 1st and 99th percentile',
    'Skull stripped with ANTsPyNet brain extraction',
    'Affine registration to the MNI152 template, 1 mm',
    'N4 bias-field correction',
    'Non-local means denoising',
    'Brain mask applied, background set to 0',
    'Scaled to the 0 to 1 range',
  ],
  format: 'NIfTI (.nii.gz), float32, one file per subject, plus labels.csv',
  note: 'The IOP site is left out because it was the site the brain-age models struggled with most in iAudit. Preprocessing is automatic and was not checked scan by scan.',
  related: 'iaudit',
};

export const CREDENTIALS = [
  { label: 'Winner · Hack-N-Droid 2.0', detail: 'Android Club, VIT Chennai · Mar 2026', url: 'https://github.com/sudarsan2507-hue/spatialAuth' },
  { label: 'Finalist · ET AI Hackathon 2026', detail: 'Project Aegis AI · team of 4', url: 'https://github.com/sudarsan2507-hue/Aegis' },
  { label: 'Selected for Junction, Europe', detail: 'Hand-picked from a global pool · 2026' },
  { label: 'IEEE author', detail: '1 publication · 2026', url: 'https://ieeexplore.ieee.org/author/607201746740566' },
  { label: 'NLP research intern, NIT Trichy', detail: 'May to July 2026 · rated Excellent', url: 'https://github.com/sudarsan2507-hue/GradeRAG' },
  { label: 'Kaggle dataset · ISIC 2019', detail: 'DOI 10.34740/kaggle/dsv/20910302', url: 'https://doi.org/10.34740/kaggle/dsv/20910302' },
  { label: 'Kaggle dataset · IXI brain MRI', detail: 'DOI 10.34740/kaggle/dsv/21848925', url: 'https://doi.org/10.34740/kaggle/dsv/21848925' },
  { label: 'OCI Generative AI Professional', detail: 'Oracle · 2025' },
  { label: 'OCI Data Science Professional', detail: 'Oracle · 2025' },
];

export const PEOPLE = [
  {
    name: 'Dr. A. Santhanavijayan',
    title: 'Assistant Professor, Department of CSE, NIT Tiruchirappalli',
    note: 'Supervised our research internship, where I built GradeRAG, 18 May to 2 July 2026.',
  },
  {
    name: 'M. Sekar',
    title: 'Research scholar, NIT Tiruchirappalli',
    note: 'Mentored our intern group day to day during the GradeRAG internship.',
  },
];

/** Other hackathon results, shown beside the win. */
export const MORE_WINS = [
  {
    result: 'Finalist',
    name: 'ET AI Hackathon 2026',
    body: 'Problem statement #6: counterfeiting, fraud and digital-arrest scams. Our team of four reached the finals with Aegis AI, which joins scam calls, mule accounts and fake currency into one case for police. I owned its Fraud Shield module.',
    link: { label: 'Aegis AI on GitHub', url: 'https://github.com/sudarsan2507-hue/Aegis' },
  },
  {
    result: 'Selected to compete',
    name: 'Junction, Europe',
    body: 'Hand-picked from a global applicant pool to build at Junction, one of Europe’s largest hackathons.',
  },
];

export const HACKATHON = {
  name: 'Hack-N-Droid 2.0',
  result: 'Winner',
  date: '3 March 2026',
  host: 'Android Club, VIT Chennai, with the Office of Student Welfare',
  sponsors: ['Interview Buddy', 'SEQATO', '.xyz'],
  project: 'spatialAuth',
};

