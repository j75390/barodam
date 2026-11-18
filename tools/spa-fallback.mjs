// GitHub Pages serves 404.html for unknown paths. Copying the app shell there lets
// clean URLs like /products/105 load the React app, which then routes on the client.
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('dist/index.html')) throw new Error('dist/index.html not found — run vite build first');
copyFileSync('dist/index.html', 'dist/404.html');
console.log('spa-fallback: dist/404.html written');
