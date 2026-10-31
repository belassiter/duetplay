# Developer & Agent Guidelines

## Definition of Done
- **Confirm the intended changes are actually present**.
- **Run the validation suite**: After any code changes, before declaring any task complete, run `npm run validate` (which runs `npm run check`, `npm test`, and `npm run build`). All checks and tests must pass with 0 failures and 0 warnings.
- **Clean up temporary files**

## Architecture & Core Application Rules

### 1. Verovio (WASM) Lifecycle
- **Never re-initialize the Verovio engine on every render**: Verovio WASM initialization is expensive. Always preserve the toolkit instance in a Ref or Context (`useVerovio.ts`).
- **Rendering & Viewport**: Render scores via `renderData(xml, options)`. Adjust margins and scale through Verovio options, avoiding excessive container wrappers that clip sheet music or break mobile scrolling.

### 2. MusicXML & Transposition Pipeline
- **Use `tonal` for musical pitch logic**: Use `tonal` for interval, pitch, and semitone math rather than ad-hoc string manipulation.
- **Transposition Order & Range Preview**: Beware of double-transposition bugs. Components analyzing score ranges (like `RangePreview`) must inspect the correct state without reapplying already-applied pitch shifts.
- **Grand Staff Splitting**: Retain support for exploding 2-staff piano systems into separate parts for duet assignment.

### 3. PDF Generation & Font Embedding
- **SMuFL Fonts**: PDF export uses `jsPDF` and `svg2pdf.js`. Musical notation glyphs and metronome marks require SMuFL fonts (`Leipzig.ttf`, `Bravura.ttf`) loaded into `jsPDF`'s virtual file system (`src/utils/pdfFonts.ts`). Do not bypass font loading to prevent character corruption (mojibake).

### 4. DuetPlay vs. QuartetPlay (Dual Variant Architecture)
- **Do not hardcode 2-part assumptions**: While DuetPlay manages 2 parts (often split from a grand staff), QuartetPlay manages 4 distinct parts (SATB). Data manipulation, transposition (`src/utils/xmlTranspose.ts`), and range calculations must support arbitrary part counts (1 through 4+).
- **Environment & Manifest Switching**:
  - **DuetPlay** (default): Uses `public_duet/` and `public/songs.json` (deployed to `/duetplay/` via `dist/`).
  - **QuartetPlay** (`--mode quartet`): Uses remote assets via `VITE_ASSETS_BASE_URL` and `public/quartet-songs.json` (deployed to `/quartetplay/` via `dist-quartet/`).
- **Dev & Build Commands**:
  - Always use `--mode quartet` equivalents (`npm run dev:quartet`, `npm run build:quartet`) when testing quartet functionality.
  - Local quartet dev relies on sibling directory `../esquartet/sheetmusic` via Vite server filesystem allow rules (`server.fs.allow: ['..']`).
- **Generated Assets**: `public/songs.json`, `public/quartet-songs.json`, `dist/`, and `dist-quartet/` are build artifacts. Do not manually edit or check them into git.

### 5. Ensemble Types & Notation Conventions
- **Standard Saxophone Quartet**:
  - `SATB`: Soprano Sax, Alto Sax, Tenor Sax, Baritone Sax.
  - `(A)SATB`: Standard SATB quartet with an extra alternate part where an Alto Sax substitutes for Soprano Sax (Parts: Alto 1 sub / Soprano, Alto 2, Tenor, Bari).
  - `AATB`: Alto Sax 1, Alto Sax 2, Tenor Sax, Baritone Sax.
  - `(S)AATB`: AATB quartet with an extra alternate part where a Soprano Sax substitutes for Alto Sax 1.
- **Baritone Saxophone Ensembles (Distinct from Sax Quartet)**:
  - `BBBB` / `4-Bari`: 4-Baritone Saxophone Quartet. This is a distinct ensemble type with unique low-register voicings; never interchange or mix files, links, or metadata between `BBBB` and standard `SATB` arrangements.
  - `BBB` / `3-Bari`: 3-Baritone Saxophone Trio.
- **Other Chamber Ensembles**:
  - `BassClarinets`: Bass Clarinet Quartet.
  - Other distinct groups in the library include Clarinet Quartet, Clarinet Quintet, and Sax Choir.

## Testing Philosophy: High-Value, Pragmatic Testing
- **Test real business logic**: Focus tests on data transformations (MusicXML manipulations, transposition algorithms, range calculations, font loader edge cases). Do not test third-party UI libraries.
- **Test inputs and outputs, not mocks**: Keep tests fast, pure, and deterministic using Vitest (`npm test`).
- **Test against messy real-world data**: Sheet music and MusicXML often have varied part names, multi-staff systems, missing metadata, or irregular clefs.

## Documentation
*   You must maintain `copilot_journal.md`. 
*   After the verification steps pass, add an entry to the journal quoting the user's exact prompt text (do not paraphrase or ellipsis) and summarizing the changes, using standard file editing commands. Include the date and time for each entry, and add new entries to the top of the file.
