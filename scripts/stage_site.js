#!/usr/bin/env node
/**
 * Copies the public static site into site/.
 * That directory is the only tree GitHub Pages uploads.
 * It does not contain data/, scripts/, docs/, geojson/, terrain tiles, or preview images.
 *
 * Usage:
 *   node scripts/stage_site.js
 *   node scripts/stage_site.js --check
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');

const FILES = [
  'index.html',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
];
const DIRS = ['css', 'js', 'topics'];
const ASSET_FILES = ['assets/favicon.svg'];
const ASSET_DIRS = ['assets/icons'];

function listFiles(relDir) {
  const abs = path.join(ROOT, relDir);
  const out = [];
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

function allowlist() {
  const rels = [...FILES];
  for (const dir of DIRS) rels.push(...listFiles(dir));
  rels.push(...ASSET_FILES);
  for (const dir of ASSET_DIRS) rels.push(...listFiles(dir));
  return rels.sort();
}

function denied(rel) {
  const norm = rel.replace(/\\/g, '/');
  if (norm.startsWith('data/') || norm.startsWith('scripts/') || norm.startsWith('docs/') || norm.startsWith('geojson/') || norm.startsWith('skills/')) {
    return true;
  }
  if (norm.startsWith('assets/terrain') || norm === 'assets/terrain_relief.webp') return true;
  if (norm.startsWith('assets/preview_') || norm.startsWith('assets/hero_')) return true;
  if (norm.endsWith('.md') || norm.startsWith('.git')) return true;
  return false;
}

function copyFile(rel) {
  const from = path.join(ROOT, rel);
  const to = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, base));
    else if (entry.isFile()) out.push(path.relative(base, abs).replace(/\\/g, '/'));
  }
  return out;
}

function main(argv) {
  const check = argv.includes('--check');
  const wanted = allowlist();
  for (const rel of wanted) {
    if (denied(rel)) {
      console.error(`✗ allowlist includes a denied path: ${rel}`);
      return 1;
    }
    if (!fs.existsSync(path.join(ROOT, rel))) {
      console.error(`✗ missing publish file: ${rel}`);
      return 1;
    }
  }
  if (!check) {
    fs.rmSync(SITE, { recursive: true, force: true });
    fs.mkdirSync(SITE, { recursive: true });
    for (const rel of wanted) copyFile(rel);
    fs.writeFileSync(path.join(SITE, 'ALLOWLIST.txt'), wanted.join('\n') + '\n');
  }
  if (!fs.existsSync(SITE)) {
    console.error('✗ site/ does not exist. Run node scripts/stage_site.js');
    return 1;
  }
  const present = walk(SITE).filter((rel) => rel !== 'ALLOWLIST.txt').sort();
  const problems = [];
  const wantedSet = new Set(wanted);
  for (const rel of present) {
    if (denied(rel) || !wantedSet.has(rel)) problems.push(`site/${rel} is outside the publish allowlist`);
  }
  for (const rel of wanted) {
    if (!present.includes(rel)) problems.push(`site/${rel} is missing`);
    else if (!fs.readFileSync(path.join(SITE, rel)).equals(fs.readFileSync(path.join(ROOT, rel)))) {
      problems.push(`site/${rel} does not match the source file`);
    }
  }
  const boot = fs.readFileSync(path.join(SITE, 'js/atlas_boot.js'), 'utf8');
  const full = fs.readFileSync(path.join(SITE, 'js/atlas_snapshots.js'), 'utf8');
  if (!boot.includes('"r":[]') || boot.includes('"shape"')) problems.push('site/js/atlas_boot.js still carries polygon geometry');
  if (!full.includes('"r":[]') || full.includes('"shape"')) problems.push('site/js/atlas_snapshots.js still carries polygon geometry');
  if (problems.length) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    return 1;
  }
  console.log(check ? `✓ site/ matches the publish allowlist (${wanted.length} files)` : `Staged site/ (${wanted.length} files)`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exitCode = 1;
  }
}
