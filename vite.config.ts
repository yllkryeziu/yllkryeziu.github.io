import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), {
        name: 'multiplayer-article',
        configureServer(server) {
          server.middlewares.use((request, _response, next) => {
            if (request.url?.split('?')[0] === '/multiplayer/') {
              request.url = request.url.replace('/multiplayer/', '/multiplayer/index.html');
            }
            next();
          });
        },
      }],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
