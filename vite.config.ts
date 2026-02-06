/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = env.VITE_BASE_URL || '/duetplay/';
  
  // Content Dir Logic:
  // 1. If CONTENT_DIR env var is set, use it.
  // 2. If mode is 'quartet', use 'public' (base assets only) - data comes from separate steps
  // 3. Default (DuetPlay): use 'public_duet' (which contains mxl files) AND 'public' (base assets)?
  // Vite 'publicDir' only supports one directory.
  // Solution: We should keep 'public' for shared assets (images, etc) and 'public_duet' for local content.
  // BUT: Vite copies everything from publicDir to root.
  
  // Strategy:
  // DuetPlay Build: publicDir = 'public_duet' (and we rely on 'public' assets being copied manually or handled separately? No, that's messy)
  // BETTER: 
  // Keep shared assets (logo, etc) in 'public'.
  // DuetPlay content is in 'public_duet'.
  
  // We can use a Copy Plugin or multiple Public Dirs if we use a plugin, but let's keep it simple.
  // Setting publicDir to 'public_duet' means we LOSE 'public' (logos).
  
  // Adjusted Plan:
  // 1. Shared assets stay in 'public'.
  // 2. Duet-specific assets in 'public_duet'.
  // 3. Quartet-specific assets (none local, all remote).
  
  // Logic: 
  // If DuetPlay (default): We want to Merge 'public' + 'public_duet'.
  // Since Vite doesn't support array for publicDir natively, we might need to manually copy specific files or just accept that 'public' IS the shared root.
  // AND 'public_duet' is the content root.
  
  // Actually, simplest is:
  // Standard Build: default publicDir is 'public'. 
  // We add 'public_duet' as a secondary source via a plugin or just copy.
  // OR we just set publicDir = 'public' and COPY the mxl files from public_duet to dist during build.
  
  // Let's go with:
  // publicDir = 'public' (Always).
  // Custom Build Step copies 'public_duet' content to 'dist' for DuetPlay only.
  
  const publicDir = 'public';
  const outDir = mode === 'quartet' ? 'dist-quartet' : 'dist';

  const contentDir = mode === 'quartet' 
    ? path.resolve(__dirname, '../esquartet/sheetmusic') 
    : path.resolve(__dirname, 'public_duet');

  return {
    base: baseUrl,
    publicDir: publicDir,
    server: {
        fs: {
            allow: ['..'] // Allow serving files from one level up (for esquartet)
        }
    },
    plugins: [
      react(),
      {
          name: 'serve-content-dir',
          configureServer(server) {
              server.middlewares.use((req, res, next) => {
                  if (!req.url) return next();
                  
                  // Check if the request is for an asset in our content directory
                  // The URL will be relative to base. e.g. /duetplay/foo.mxl or /quartetplay/foo.mxl
                  // We need to strip the base URL
                  let url = req.url;
                  if (url.startsWith(baseUrl)) {
                      url = url.slice(baseUrl.length - 1); // Keep the leading slash e.g. /foo.mxl
                  }
                  
                  // Simple check: if it ends with .mxl, try to serve from contentDir
                  if (url.endsWith('.mxl')) {
                       const filePath = path.join(contentDir, url);
                       if (fs.existsSync(filePath)) {
                           // Serve the file
                           res.setHeader('Content-Type', 'application/vnd.recordare.musicxml+xml'); // Correct mime? or text/xml
                           const stream = fs.createReadStream(filePath);
                           stream.pipe(res);
                           return;
                       }
                  }
                  next();
              });
          }
      },
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          const title = env.VITE_APP_TITLE || 'DuetPlay';
          const logo = env.VITE_APP_LOGO || 'duetplay_logo.png';
          // Replace title
          html = html.replace(/<title>(.*?)<\/title>/, `<title>${title}</title>`);
          // Replace logo href (assumes standard link tag structure from index.html)
          html = html.replace(/href="\/duetplay_logo.png"/, `href="/${logo}"`);
          return html;
        }
      },
      {
        name: 'exclude-temp-folder',
        closeBundle: async () => {
          const tempPath = path.resolve(outDir, 'temp');
          if (fs.existsSync(tempPath)) {
            try {
              fs.rmSync(tempPath, { recursive: true, force: true });
              console.log(`Removed ${tempPath} from build output`);
            } catch (e) {
              console.warn(`Failed to remove ${tempPath}:`, e);
            }
          }
        }
      }
    ],
    build: {
      outDir: outDir,
      emptyOutDir: true,
      rollupOptions: {
      output: {
        // Organize assets into subfolders
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
 }
})
