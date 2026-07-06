import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PORT } from './config.js';
import { createGuideRun } from './workflow.js';

export function resolveProjectRoot(moduleUrl) {
  return resolve(dirname(fileURLToPath(moduleUrl)), '../..');
}

export function isMainModule(entryPath, moduleUrl, cwd = process.cwd()) {
  if (!entryPath) return false;
  return pathToFileURL(resolve(cwd, entryPath)).href === moduleUrl;
}

const rootDir = resolveProjectRoot(import.meta.url);
const webDir = join(rootDir, 'web');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendStatic(response, urlPath) {
  const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = join(webDir, requestedPath);

  if (!filePath.startsWith(webDir) || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] || 'text/plain; charset=utf-8' });
  createReadStream(filePath).pipe(response);
}

export function createAppServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'POST' && url.pathname === '/api/runs') {
      try {
        const input = await readJsonBody(request);
        const run = await createGuideRun(input);
        sendJson(response, run.status === 'failed' ? 400 : 200, run);
      } catch (error) {
        sendJson(response, 500, { status: 'failed', errors: [error.message] });
      }
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      const pkg = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
      sendJson(response, 200, { ok: true, name: pkg.name });
      return;
    }

    if (request.method === 'GET') {
      sendStatic(response, url.pathname);
      return;
    }

    response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
  });
}

if (isMainModule(process.argv[1], import.meta.url)) {
  const server = createAppServer();
  server.listen(PORT, () => {
    try {
      if (process.stdout.writable) {
        console.log(`Game Guide Agent Lab running at http://localhost:${PORT}`);
      }
    } catch {
      // Hidden Windows process hosts may not provide a writable console.
    }
  });
}
