#!/usr/bin/env node

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const port = Number(readArg('--port') || process.env.PORT || 4300);
const simulateMismatch = process.argv.includes('--simulate-mismatch');
const forcedVersion = readArg('--version');
const reportedVersion =
  forcedVersion ||
  (simulateMismatch ? incrementPatchVersion(packageJson.version) : packageJson.version);
const distDir = path.join(rootDir, 'dist', 'version-fresh-demo', 'browser');
const publicDir = path.join(rootDir, 'public');
const staticRoot = fs.existsSync(distDir) ? distDir : publicDir;

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/version.json') {
    // The version endpoint must never be cached; it is the source of truth for open browser tabs.
    sendJson(response, {
      version: reportedVersion,
      packageVersion: packageJson.version,
      simulatedMismatch: simulateMismatch,
      generatedAt: new Date().toISOString(),
    });
    return;
  }

  serveStaticFile(requestUrl.pathname, response);
});

server.listen(port, () => {
  console.log(`[version-server] Serving ${staticRoot}`);
  console.log(`[version-server] Version endpoint reports ${reportedVersion}`);
  console.log(`[version-server] Open http://localhost:${port}`);
});

function serveStaticFile(pathname, response) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, '');
  const requestedFile = cleanPath || 'index.html';
  const filePath = path.normalize(path.join(staticRoot, requestedFile));

  if (!filePath.startsWith(staticRoot)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(response, filePath);
    return;
  }

  const indexPath = path.join(staticRoot, 'index.html');

  if (fs.existsSync(indexPath)) {
    sendFile(response, indexPath);
    return;
  }

  sendText(
    response,
    404,
    'Build the Angular app first with npm run build, then restart this server.',
  );
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath);
  const cacheHeader = shouldCacheForever(filePath)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache, no-store, must-revalidate';

  response.writeHead(200, {
    'Content-Type': contentType(extension),
    'Cache-Control': cacheHeader,
  });
  fs.createReadStream(filePath).pipe(response);
}

function sendJson(response, value) {
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  response.end(JSON.stringify(value, null, 2));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  response.end(message);
}

function shouldCacheForever(filePath) {
  return /\.[a-f0-9]{8,}\./i.test(path.basename(filePath));
}

function contentType(extension) {
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
  };

  return types[extension] || 'application/octet-stream';
}

function readArg(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function incrementPatchVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    return '999.999.999';
  }

  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}
