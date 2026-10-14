import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '_site');
fs.mkdirSync(output, {recursive: true});
fs.copyFileSync(path.join(root, '春日小花园.html'), path.join(output, 'index.html'));
for (const file of ['LICENSE','THIRD_PARTY_NOTICES.md']) fs.copyFileSync(path.join(root,file), path.join(output,file));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
fs.writeFileSync(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://marquis-chan.github.io/spring-garden/sitemap.xml\n');
fs.writeFileSync(path.join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://marquis-chan.github.io/spring-garden/</loc></url></urlset>\n');
console.log('Packaged the standalone game and license notices for GitHub Pages.');
