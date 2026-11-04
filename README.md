# Neural Flow Portfolio

My personal portfolio site: an AI-themed single page with a 3D neural-network hero, horizontal
scrolling sections, project cards and certifications (OCI Generative AI Professional, OCI Data
Science Professional).

## Built with

React 19 · TypeScript · Vite · Tailwind CSS 4 · Three.js (React Three Fiber, drei) · GSAP ·
Motion

- `src/components/ThreeElements.tsx` - the 3D hero and animated neural background
- `src/components/ProjectCard.tsx` - project cards
- `src/components/CustomCursor.tsx` - custom cursor
- `src/App.tsx` - page layout and sections

## Run locally

Requires Node.js.

```bash
npm install
npm run dev
```

Build for production with `npm run build`; the output goes to `dist/`.
