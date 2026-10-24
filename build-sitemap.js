
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://raw-assembly.pages.dev';
const KEY = 'c2505c58b8164384989bd0b8a446fa5d';

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const URLS_FILE = path.join(ROOT, 'urls.txt');
const REDIRECTS_FILE = path.join(PUBLIC_DIR, '_redirects');
const SITEMAP_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');
const KEY_FILE = path.join(PUBLIC_DIR, `${KEY}.txt`);

if (!fs.existsSync(URLS_FILE)) {
  throw new Error('urls.txt is missing. Deployment stopped.');
}

if (!fs.existsSync(REDIRECTS_FILE)) {
  throw new Error('public/_redirects is missing. Deployment stopped.');
}

const redirectRules = fs.readFileSync(REDIRECTS_FILE, 'utf8')
  .split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith('#'));

if (redirectRules.length > 2000) {
  throw new Error(`Redirect validation failed: ${redirectRules.length} rules.`);
}

const inputUrls = fs.readFileSync(URLS_FILE, 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);

const urls = new Set();

for (const value of inputUrls) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL in urls.txt: ${value}`);
  }

  if (
    url.hostname.toLowerCase() !== 'raw-assembly.pages.dev' ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(`Unexpected URL in urls.txt: ${value}`);
  }

  // Use HTTPS consistently in the sitemap.
  url.protocol = 'https:';

  // Normalize duplicate slashes in the pathname.
  url.pathname = '/' + url.pathname.split('/').filter(Boolean).join('/');

  urls.add(url.href);
}

if (urls.size === 0) {
  throw new Error('No valid URLs found. Deployment stopped.');
}

const lastmod = new Date().toISOString();

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

for (const url of urls) {
  xml += '  <url>\n';
  xml += `    <loc>${escapeXml(url)}</loc>\n`;
  xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += '    <changefreq>hourly</changefreq>\n';
  xml += '  </url>\n';
}

xml += '</urlset>\n';

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Update only generated files. Never rewrite or delete _redirects.
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
fs.writeFileSync(KEY_FILE, KEY, 'utf8');

// Final safety checks before deployment.
if (!fs.existsSync(REDIRECTS_FILE)) {
  throw new Error('_redirects disappeared. Deployment stopped.');
}

if (!fs.existsSync(SITEMAP_FILE) || !fs.existsSync(KEY_FILE)) {
  throw new Error('Sitemap or IndexNow key file is missing.');
}

console.log(`Sitemap URLs: ${urls.size}`);
console.log(`lastmod: ${lastmod}`);
console.log('changefreq: hourly');
console.log(`Redirect rules preserved: ${redirectRules.length}`);
console.log('Build validation passed.');
