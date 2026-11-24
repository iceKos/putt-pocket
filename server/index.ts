import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { attachRooms } from './rooms.ts';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT ?? 5173);
const host = process.env.HOST ?? '0.0.0.0';
const dist = resolve(import.meta.dirname, '../dist');
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const http = createServer();
const upgradeRoom = attachRooms();

if (dev) {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({ server: { middlewareMode: true, hmr: { server: http } }, appType: 'spa' });
  http.on('request', vite.middlewares);
} else {
  http.on('request', async (req, res) => {
    const pathname = (req.url ?? '').split('?')[0];
    const relative = pathname === '/' ? 'index.html' : /^\/assets\/[\w.-]+$/.test(pathname) ? pathname.slice(1) : '';
    if (!relative || (req.method !== 'GET' && req.method !== 'HEAD')) {
      res.writeHead(404).end();
      return;
    }
    const path = resolve(dist, relative);
    const type = types[extname(path)];
    const info = type ? await stat(path).catch(() => null) : null;
    if (!info?.isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': info.size,
      'Cache-Control': relative === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(path).on('error', () => res.destroy()).pipe(res);
  });
}

http.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') upgradeRoom(request, socket, head);
  else if (!dev) socket.destroy();
});
http.listen(port, host, () => console.log(`Putt Pocket at http://${host}:${port}`));
