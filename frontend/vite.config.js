// frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration
 * ------------------
 * • Binds to 0.0.0.0 so the dev server is reachable from other devices.
 * • Locks the port to 4200 (strictPort: true) – Vite will fail loudly if busy.
 * • Merges variables from .env and .env.[mode] into import.meta.env at runtime.
 * • Exposes VITE_API_URL (or any other VITE_* vars) to the client code.
 * • Optional proxy block shows how to forward /api to a backend.
 */
export default ({ mode }) => {
  // Merge process.env with values from .env files
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    plugins: [react()],

    server: {
      host: '0.0.0.0', // listen on all interfaces
      port: 4200,
      strictPort: true, // fail if 4200 is busy (useful in CI)

      // Example backend proxy (uncomment & adjust target if needed)
      /*
      proxy: {
        '/api': {
          target: env.VITE_API_URL,     // http://localhost:8000
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
      */
    },

    // Make env vars available in client code exactly as written
    define: {
      'import.meta.env': JSON.stringify(env),
      // If you only want specific vars, you can expose them individually:
      // 'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
  });
};
