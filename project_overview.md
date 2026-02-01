# Project Brief: DuetPlay
**Tagline:** Customize duets for any instruments.
**Type:** Client-Side Web Application (PWA).
**Repo Goal:** Open Source Music Utility.

## Product Vision
DuetPlay is a browser-based tool that creates "instant duets" for any instrument pair. Users load a MusicXML file, select two instruments (e.g., Alto Sax + Bassoon), and the app renders the score with correct transposition and clefs in real-time.

## Tech Stack
* **Framework:** Vite + React (TypeScript).
    * *Reasoning:* Chosen for strict type safety and high reliability with AI code generation.
* **UI Library:** Shadcn/UI (Tailwind CSS).
    * Use standard `Dialog` for instrument settings and `DataTable` for song selection.
* **Rendering Engine:** **Verovio** (Wasm).
    * *Critical:* Must load `verovio.wasm` from the `public/` directory.
    * *Constraint:* Do not re-initialize the engine on every render. Keep the instance in a Ref or Context.
* **Music Logic:** `tonal` (NPM library).
    * Use `tonal` to calculate semitone shifts (e.g., Concert C → Alto Sax A = +9 semitones).
* **Hosting:** Cloudflare Pages.
    * *Constraint:* Must support `application/wasm` MIME type via `_headers` or `wrangler.toml`.

## Core Logic Requirements
1.  **The "Score Engine" Hook:**
    * Create `useVerovio.ts`.
    * It must handle the Wasm initialization asynchronously.
    * It exposes a function: `renderDuet(xmlData, instrument1, instrument2)`.
    * **Verovio Logic:** Use `toolkit.setOptions()` to scale the SVG and set the correct page width. Use `toolkit.renderData(xml, options)` to generate the SVG string.
2.  **Transposition Logic:**
    * Load instrument definitions from `src/config/instruments.json`.
    * When an instrument is selected, calculate the `transpose` value.
    * Pass this value to Verovio's option `{ transpose: X }`.

## Immediate Next Steps
1.  Scaffold the Vite project structure.
2.  Install dependencies: `verovio`, `tonal`, `lucide-react`, `clsx`, `tailwind-merge`.
3.  Set up the `public` folder with a sample MusicXML file and the `verovio.wasm` file.