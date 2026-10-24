
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
  throw new Error('urls.txt is missing. Sitemap generation stopped.');
}

if (!fs.existsSync(REDIRECTS_FILE)) {
  throw new Error('public/_redirects is missing. Deployment stopped.');
}

const redirectRules = fs.readFileSync(REDIRECTS_FILE, 'utf8')
  .split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith('#'));

if (redirectRules.length > 2000) {
  throw new Error(`Redirect rule check failed: ${redirectRules.length} rules.`);
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

  if (url.origin !== DOMAIN) {
    throw new Error(`Unexpected URL domain: ${value}`);
  }

  // Remove duplicate slashes from the pathname only.
  url.pathname = '/' + url.pathname.split('/').filter(Boolean).join('/');

  urls.add(url.href);
}

if (urls.size === 0) {
  throw new Error('No valid URLs found. Sitemap generation stopped.');
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

// Only update the generated sitemap and IndexNow key.
// Do not modify or regenerate public/_redirects.
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
fs.writeFileSync(KEY_FILE, KEY, 'utf8');

// Verify the redirect file still exists after generation.
if (!fs.existsSync(REDIRECTS_FILE)) {
  throw new Error('Redirect file disappeared during generation.');
}

console.log(`Sitemap URLs: ${urls.size}`);
console.log(`lastmod: ${lastmod}`);
console.log('changefreq: hourly');
console.log(`Redirect rules preserved: ${redirectRules.length}`);
console.log('IndexNow verification file generated.');
