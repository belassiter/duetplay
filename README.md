# DuetPlay

DuetPlay is a web-based tool adapting duets for any pairing of instruments. Choose a song from the online library, then choose your instruments. Adjust octaves and key to better fit your instruments. Then play a duet with your friend!

## How to use
1. Click `Select Song`, choose a song. Use search to narrow down the title, composer, and arranger. Use filtering to narrow down style and difficulty level.
1. Click `Select Instruments`. Select your instruments from the list. The range of the song will be shown below, with blue=easy, orange=difficult, red=out of range. Use the octave adjustment to adjust the range for one instrument, or use the key slider to adjust for both instruments.
1. Use the `zoom slider` to adjust the size of the sheet music.

## Features

-   **MusicXML Rendering**: Uses [Verovio](https://www.verovio.org/) to render scores directly in the browser.
-   **Intelligent Transposition**: Supports global key changes and individual instrument octave shifts.
-   **Grand Staff Explosion**: Automatically splits complex piano systems (2 staves) into two distinct parts (Right Hand / Left Hand) for easier assignment in a duet setting.
-   **Part Isolation**: View full score or isolate individual parts.
-   **Responsive Design**: Works on Desktop and Mobile (Portrait/Landscape).

## Development

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run locally**:
    ```bash
    npm run dev
    ```

3.  **Build**:
    
    *   **DuetPlay** (Default):
        ```bash
        npm run build
        ```
        This builds the standard app using songs in `public/` and deploys to `public_html/duetplay/`.

    *   **QuartetPlay** (Variant):
        ```bash
        npm run build:quartet
        ```
        This builds the Quartet variant. 
        **Prerequisite**: This command expects the `esquartet` repository to be cloned as a sibling directory (`../esquartet`) containing the sheet music in `sheetmusic/`.
        It generates a fresh `songs.json` from that directory before building.


## Project Structure

-   `src/`: React source code.
-   `public/`: Static assets (MusicXML files).
-   `public/temp/`: Local tools (Search UI) - *Not deployed*.

## CSV Search Tool (Local Only)

This project includes a local-only tool for searching the header metadata of large PDMX datasets.
To use it locally:
1.  Place `PDMX.csv` in `public/temp/`.
2.  Navigate to `http://localhost:5173/temp/search.html`.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
