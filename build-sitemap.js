const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://raw-assembly.pages.dev';
const urlsFile = path.join(__dirname, 'urls.txt');
const outputPath = path.join(__dirname, 'public', 'sitemap.xml');

if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
}

let urls = [];
if (fs.existsSync(urlsFile)) {
    urls = fs.readFileSync(urlsFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
} else {
    urls = [`${DOMAIN}/`];
}

const now = new Date().toISOString();

let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemapXML += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

urls.forEach(url => {
    sitemapXML += `  <url>\n`;
    sitemapXML += `    <loc>${url}</loc>\n`;
    sitemapXML += `    <lastmod>${now}</lastmod>\n`;
    sitemapXML += `  </url>\n`;
});

sitemapXML += `</urlset>`;

fs.writeFileSync(outputPath, sitemapXML, 'utf8');
console.log(`Sitemap successfully generated with ${urls.length} URLs at ${now}`);
