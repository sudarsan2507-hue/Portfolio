# Sudarsan Ravichandran · Portfolio

**Live site: [sudarsan2507-hue.github.io/Portfolio](https://sudarsan2507-hue.github.io/Portfolio/)**

| View | Link |
|---|---|
| Entrance, choose a view | [sudarsan2507-hue.github.io/Portfolio](https://sudarsan2507-hue.github.io/Portfolio/) |
| Crisp, one page | [sudarsan2507-hue.github.io/Portfolio/#crisp](https://sudarsan2507-hue.github.io/Portfolio/#crisp) |
| Detailed, full 3D tour | [sudarsan2507-hue.github.io/Portfolio/#detailed](https://sudarsan2507-hue.github.io/Portfolio/#detailed) |

My portfolio site. It opens on a 3D entrance where you pick a view; the particles fold into a cube
(Crisp) or a galaxy (Detailed) as you hover, then warp past the camera into the view you chose.

- **Crisp** (`#crisp`): one page with my top projects, achievements, internship, paper and dataset.
  A particle cloud beside the text changes shape for each section.
- **Detailed** (`#detailed`): scrolling flies a camera through a 3D world with one scene per chapter:

| Chapter | 3D scene |
|---|---|
| Hero | A live failure-aware graph search that remembers dead ends and never retries them |
| Research | A loop of points where a comet marks each failure and the point is remembered |
| IEEE paper | A Schottky tunnel FET: electrons tunnel through the barrier, trap charges blink under the gate |
| Agent safety | Tool calls stream into a checkpoint; allowed calls pass, injected ones are stopped |
| Sensing | Wi-Fi waves between two ESP32 boards, with a satellite overhead |
| Kaggle dataset | Image tiles assemble into train / val / test blocks in the real 80 / 10 / 10 split |
| Apps | An exploded full stack: interface, API, model, deploy |
| Universe | Every project as an interactive constellation (drag, hover, click) |
| Contact | A spiral galaxy, one arm per area of work |

All 47 of my GitHub repositories are accounted for. Team projects say which part was mine, and forks I
didn't commit to are listed separately with credit to their authors.

## Built with

React 19 · TypeScript · Vite · Tailwind CSS 4 · Three.js with React Three Fiber, drei and postprocessing ·
Motion · Lenis

| Path | What it is |
|---|---|
| `src/data/projects.ts` | Every project, the IEEE paper, the dataset and links. Edit this to update the content |
| `src/three/store.ts` | Maps scroll position to a camera position between chapters |
| `src/three/World.tsx` | The fixed WebGL world: camera rig, star corridor, bloom, the chapter scenes |
| `src/three/stations/` | One 3D scene per chapter |
| `src/components/ProjectUniverse.tsx` | The interactive project constellation |
| `src/Root.tsx` | Switches between the entrance, Crisp and Detailed, and runs the warp between them |
| `src/gate/Gate.tsx` | The 3D entrance (a GPU particle shader) |
| `src/crisp/` | The Crisp view and its scroll-morphing particle cloud |
| `src/App.tsx`, `src/index.css` | The Detailed view: layout, copy and styles |

Each 3D scene only animates while the camera is near it, and the page respects `prefers-reduced-motion`.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run build` writes a static site to `dist/`.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages through
`.github/workflows/deploy.yml`.

## License

[MIT](LICENSE)
