// Builds everything that has to be uploaded to the web host:
//   release/ems-web.zip      -> extract into public_html/ems   (static site + .htaccess + api.php)
//   release/ems-laravel.zip  -> extract into a NEW folder "ems-laravel" next to public_html (the API; no dev packages)
//
//   node deploy/build-release.mjs [https://ems.tawakalent.com]
import {execSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';
import {crc32, deflateRawSync} from 'node:zlib';

const siteUrl = (process.argv[2] ?? 'https://ems.tawakalent.com').replace(/\/$/, '');
const root = resolve(import.meta.dirname, '..');
const release = join(root, 'release');
const run = (command, cwd = root, env = {}) => execSync(command, {cwd, stdio: 'inherit', env: {...process.env, ...env}});

console.log(`\n== Building for ${siteUrl}\n`);
rmSync(release, {recursive: true, force: true});
mkdirSync(release, {recursive: true});

// 1. static site -------------------------------------------------------------------------------
const exportDir = join(root, '.next-export');
rmSync(exportDir, {recursive: true, force: true});
run('npx next build', root, {NEXT_EXPORT: '1', NEXT_OUTPUT_DIR: '.next-export', NEXT_PUBLIC_API_BASE_URL: siteUrl});
const web = join(release, 'web');
cpSync(exportDir, web, {recursive: true});
cpSync(join(root, 'deploy', 'web', '.htaccess'), join(web, '.htaccess'));
cpSync(join(root, 'deploy', 'web', 'api.php'), join(web, 'api.php'));

// 2. Laravel (production packages only) ---------------------------------------------------------
const source = join(root, 'laravel-backend');
const app = join(release, 'ems-laravel');
const skip = new Set(['vendor', 'tests', 'node_modules', '.phpunit.cache', '.phpunit.result.cache', 'phpunit.xml', '.env', '.env.testing', '.env.integration', '.env.example', '.env.exampl', '.gitignore', 'README.md']);
cpSync(source, app, {
  recursive: true,
  filter: path => {
    const rel = relative(source, path).split(sep);
    if (rel[0] === '' || rel[0] === undefined) return true;
    if (skip.has(rel[0])) return false;
    if (/\.(md|txt)$/.test(rel[0]) || /^(candidate|employee|smart-id)-.*\.json$/.test(rel[0])) return false; // old checkpoint reports and examples
    if (rel[0] === 'storage' && rel.length > 1 && !['app', 'framework', 'logs'].includes(rel[1])) return false; // storage/testing-mysql etc.
    if (rel[0] === 'storage' && rel.length > 2) return false; // never ship stored files, sessions, logs or caches
    if (rel[0] === 'bootstrap' && rel[1] === 'cache' && rel.length > 2) return false;
    return true;
  },
});
for (const folder of ['storage/app/private', 'storage/framework/cache/data', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs', 'bootstrap/cache']) {
  mkdirSync(join(app, folder), {recursive: true});
  writeFileSync(join(app, folder, '.gitkeep'), '');
}
cpSync(join(root, 'deploy', 'laravel', '.htaccess'), join(app, '.htaccess'));
cpSync(join(root, 'deploy', 'env.production.example'), join(app, 'env.production.example'));
console.log('\n== Installing production PHP packages\n');
run('composer install --no-dev --optimize-autoloader --no-interaction --no-progress', app);

// 3. zip files (forward-slash paths, readable by the host's File Manager) ----------------------------
function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
function writeZip(directory, target) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const file of files(directory)) {
    const name = Buffer.from(relative(directory, file).split(sep).join('/'));
    const data = readFileSync(file);
    const packed = deflateRawSync(data, {level: 6});
    const checksum = crc32(data) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10); header.writeUInt16LE(0x21, 12); // fixed date: 1980-01-01
    header.writeUInt32LE(checksum, 14); header.writeUInt32LE(packed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    parts.push(header, name, packed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(0x21, 14); entry.writeUInt32LE(checksum, 16); entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE((0o100644 << 16) >>> 0, 38); entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + packed.length;
  }
  const centralSize = central.reduce((total, buffer) => total + buffer.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(target, Buffer.concat([...parts, ...central, end]));
}
console.log('\n== Creating zip files\n');
writeZip(web, join(release, 'ems-web.zip'));
writeZip(app, join(release, 'ems-laravel.zip'));
for (const name of ['ems-web.zip', 'ems-laravel.zip']) {
  console.log(`${name}  ${(statSync(join(release, name)).size / 1024 / 1024).toFixed(1)} MB`);
}
console.log(existsSync(join(app, 'vendor/autoload.php')) ? '\nDone. Follow deploy/DEPLOY.md.' : '\nWARNING: vendor/autoload.php is missing.');
