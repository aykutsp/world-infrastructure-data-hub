import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deploying to GitHub Pages under a project subpath (e.g.
// https://<user>.github.io/<repo>/), set VITE_BASE_PATH=/<repo>/ in the
// deployment environment so asset URLs resolve correctly. For local dev
// and user/organisation Pages the default '/' is fine.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
});
