import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(websiteDir, 'dist');

await copyFile(resolve(distDir, 'sitemap-index.xml'), resolve(distDir, 'sitemap.xml'));
