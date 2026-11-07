import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const e2eRoot = path.resolve(__dirname, '..');

describe('E2E Configuration & Test Suite Validation', () => {
  it('should have valid playwright.config.js configured for pure ESM', async () => {
    const configPath = path.join(e2eRoot, 'playwright.config.js');
    assert.ok(fs.existsSync(configPath), 'playwright.config.js must exist');

    const configModule = await import(`file://${configPath.replace(/\\/g, '/')}`);
    const config = configModule.default;

    assert.ok(config, 'Default export should exist');
    assert.equal(config.testDir, './specs');
    assert.ok(Array.isArray(config.projects), 'Projects must be defined');
    assert.ok(config.projects.length >= 2, 'Must include both desktop and mobile projects');

    const projectNames = config.projects.map((p) => p.name);
    assert.ok(projectNames.some((n) => n.includes('Chrome')), 'Must include Chrome project');
    assert.ok(projectNames.some((n) => n.includes('Pixel') || n.includes('Mobile')), 'Must include Mobile project');
  });

  it('should have all 5 core E2E spec files created', () => {
    const specsDir = path.join(e2eRoot, 'specs');
    assert.ok(fs.existsSync(specsDir), 'specs directory must exist');

    const expectedSpecs = [
      'auth.spec.js',
      'navigation.spec.js',
      'waste-scanner.spec.js',
      'marketplace.spec.js',
      'admin.spec.js',
    ];

    for (const spec of expectedSpecs) {
      const specPath = path.join(specsDir, spec);
      assert.ok(
        fs.existsSync(specPath),
        `Spec file ${spec} must exist in specs/`
      );
    }
  });

  it('should verify test directory structure and package scripts', () => {
    const pkgJsonPath = path.join(e2eRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    assert.equal(pkg.type, 'module', 'E2E package must be ES Module');
    assert.ok(pkg.scripts.test, 'Unit/config test script must be present');
    assert.ok(pkg.scripts['test:e2e'], 'test:e2e script must be present');
  });
});
