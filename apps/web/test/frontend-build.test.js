import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

describe('Phase 5: Frontend Production Build & Asset Verification', () => {
  it('should generate dist/index.html with valid HTML structure', () => {
    const indexPath = path.join(distDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'dist/index.html must exist');
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(html.includes('<div id="root"></div>'));
    assert.ok(html.includes('SaveRaks'));
  });

  it('should generate optimized production JS and CSS bundles', () => {
    const assetsDir = path.join(distDir, 'assets');
    assert.ok(fs.existsSync(assetsDir), 'dist/assets directory must exist');
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    const cssFiles = files.filter((f) => f.endsWith('.css'));

    assert.ok(jsFiles.length > 0, 'Must produce at least one compiled JS bundle');
    assert.ok(cssFiles.length > 0, 'Must produce compiled Tailwind CSS bundle');

    // Verify bundle size is reasonable (< 1MB)
    const jsSize = fs.statSync(path.join(assetsDir, jsFiles[0])).size;
    assert.ok(jsSize > 10000 && jsSize < 1000000, `JS bundle size ${jsSize} bytes is within budget`);
  });
});
