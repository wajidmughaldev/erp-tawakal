// Serves the exported site the way the web host does: static files, extensionless URLs, and /api + /sanctum
// forwarded to the Laravel API. Use it to try the production build locally before uploading.
//
//   node deploy/local-preview.mjs [exportDir] [port] [apiOrigin]
//   node deploy/local-preview.mjs .next-export 4000 http://127.0.0.1:8001
import {createServer, request as httpRequest} from 'node:http';
import {existsSync, createReadStream, readFileSync, statSync} from 'node:fs';
import {extname, join, normalize, resolve} from 'node:path';

const root = resolve(process.argv[2] ?? '.next-export');
const port = Number(process.argv[3] ?? 4000);
const api = new URL(process.argv[4] ?? 'http://127.0.0.1:8001');
// Same security headers the host will send (read from deploy/web/.htaccess), so problems show up locally.
const securityHeaders = Object.fromEntries([...readFileSync(new URL('./web/.htaccess', import.meta.url), 'utf8').matchAll(/^\s*Header always set (\S+) "(.*)"\s*$/gm)].map(([, name, value]) => [name, value]));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon'};

function fileFor(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  for (const candidate of [clean, `${clean}.html`, join(clean, 'index.html')]) {
    const full = join(root, candidate);
    if (full.startsWith(root) && existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (/^\/(api|sanctum|up)(\/|$)/.test(url.pathname)) {
    const proxied = httpRequest({hostname: api.hostname, port: api.port, path: req.url, method: req.method, headers: req.headers}, upstream => {
      res.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(res);
    });
    proxied.on('error', () => {res.writeHead(502); res.end('API unavailable');});
    req.pipe(proxied);
    return;
  }
  if (url.pathname === '/') {res.writeHead(302, {Location: '/login'}); res.end(); return;}
  const file = fileFor(url.pathname);
  if (!file) {
    const notFound = join(root, '404.html');
    res.writeHead(404, {'Content-Type': types['.html']});
    return existsSync(notFound) ? createReadStream(notFound).pipe(res) : res.end('Not found');
  }
  res.writeHead(200, {'Content-Type': types[extname(file)] ?? 'application/octet-stream', ...securityHeaders});
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Preview: http://localhost:${port}  (static: ${root}, API: ${api.origin})`));
