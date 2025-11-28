import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        demo: './demo.html'
      }
    }
  },
  server: {
    port: 3000,
    open: '/demo.html'
  },
  plugins: [
    {
      name: 'save-measurements',
      configureServer(server) {
        server.middlewares.use('/api/save-measurements', async (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const filePath = path.resolve(__dirname, 'src/vectorium/performance/measurements.json');
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          } else {
            res.writeHead(405);
            res.end();
          }
        });
      }
    }
  ]
});
