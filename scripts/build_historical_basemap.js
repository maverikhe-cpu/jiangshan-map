#!/usr/bin/env node
/**
 * Builds js/historical_basemap.js from aourednik/historical-basemaps.
 * The published geometry is the upstream GeoJSON, not this repository's edited atlas rings.
 *
 * Usage:
 *   node scripts/build_historical_basemap.js
 *   node scripts/build_historical_basemap.js --check
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, 'data/basemap/historical-basemaps/cache');
const SOURCE_JSON = path.join(ROOT, 'data/basemap/historical-basemaps/SOURCE.json');
const OUT_JS = path.join(ROOT, 'js/historical_basemap.js');
const COMMIT = '4b5039e50d8d2464b065bd76ad6086cd4597108d';
const REPO = 'https://github.com/aourednik/historical-basemaps';
const RAW = `https://raw.githubusercontent.com/aourednik/historical-basemaps/${COMMIT}/geojson/`;
const FRAME = { west: 66, east: 142, south: 14, north: 55 };
const FILES = [
  'world_bc500.geojson',
  'world_bc400.geojson',
  'world_bc323.geojson',
  'world_bc300.geojson',
  'world_bc200.geojson',
  'world_bc100.geojson',
  'world_bc1.geojson',
  'world_100.geojson',
  'world_200.geojson',
  'world_300.geojson',
  'world_400.geojson',
  'world_500.geojson',
  'world_600.geojson',
  'world_700.geojson',
  'world_800.geojson',
  'world_900.geojson',
  'world_1000.geojson',
  'world_1100.geojson',
  'world_1200.geojson',
  'world_1279.geojson',
  'world_1300.geojson',
  'world_1400.geojson',
  'world_1492.geojson',
  'world_1500.geojson',
  'world_1530.geojson',
  'world_1600.geojson',
  'world_1650.geojson',
  'world_1700.geojson',
  'world_1715.geojson',
  'world_1783.geojson',
  'world_1800.geojson',
  'world_1815.geojson',
  'world_1878.geojson',
  'world_1880.geojson',
  'world_1900.geojson',
  'world_1914.geojson',
  'world_1920.geojson',
  'world_1930.geojson',
  'world_1938.geojson',
  'world_1945.geojson',
  'world_1960.geojson',
  'world_1994.geojson',
  'world_2000.geojson',
  'world_2010.geojson',
];

function fileYear(name) {
  const match = name.match(/^world_(bc)?(\d+)\.geojson$/);
  if (!match) return null;
  const year = Number(match[2]);
  return match[1] ? -year : year;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, { headers: { 'User-Agent': 'jiangshan-historical-basemap' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        download(response.headers.location, dest).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`${url} returned ${response.statusCode}`));
        response.resume();
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    request.on('error', reject);
  });
}

function bboxHits(geometry) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (value) => {
    if (Array.isArray(value) && typeof value[0] === 'number') {
      if (value[0] < minX) minX = value[0];
      if (value[0] > maxX) maxX = value[0];
      if (value[1] < minY) minY = value[1];
      if (value[1] > maxY) maxY = value[1];
      return;
    }
    if (Array.isArray(value)) value.forEach(walk);
  };
  walk(geometry && geometry.coordinates);
  if (!Number.isFinite(minX)) return false;
  return !(maxX < FRAME.west || minX > FRAME.east || maxY < FRAME.south || minY > FRAME.north);
}

function cleanRing(ring) {
  const out = [];
  for (const pair of ring || []) {
    const point = [Math.round(pair[0] * 10) / 10, Math.round(pair[1] * 10) / 10];
    const prev = out[out.length - 1];
    if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
    out.push(point);
  }
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) out.pop();
  }
  return out.length >= 4 ? out : null;
}

function cleanPolygons(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const kept = [];
  for (const polygon of polygons) {
    const rings = [];
    for (const ring of polygon || []) {
      const clean = cleanRing(ring);
      if (clean) rings.push(clean);
    }
    if (rings.length) kept.push(rings);
  }
  return kept;
}

async function ensureFile(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const dest = path.join(CACHE, name);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) {
    await download(RAW + name, dest);
  }
  return dest;
}

async function buildData() {
  const files = [];
  const slices = [];
  for (const name of FILES) {
    const dest = await ensureFile(name);
    const raw = fs.readFileSync(dest);
    const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
    const collection = JSON.parse(raw.toString('utf8'));
    const features = [];
    for (const feature of collection.features || []) {
      const props = feature.properties || {};
      const featureName = typeof props.NAME === 'string' ? props.NAME.trim() : '';
      if (!featureName || !feature.geometry || !bboxHits(feature.geometry)) continue;
      const polygons = cleanPolygons(feature.geometry);
      if (!polygons.length) continue;
      features.push({
        name: featureName,
        subject: props.SUBJECTO || featureName,
        precision: Number(props.BORDERPRECISION) || 1,
        polygons,
      });
    }
    features.sort((a, b) => a.name.localeCompare(b.name) || a.subject.localeCompare(b.subject));
    files.push({ name, sha256, year: fileYear(name), features: features.length });
    slices.push({ year: fileYear(name), file: name, features });
    console.log(`${name}: ${features.length} named features in frame`);
  }
  const source = {
    dataset: 'historical-basemaps',
    author: 'André Ourednik',
    repository: REPO,
    commit: COMMIT,
    retrieved: '2026-11-10',
    license: 'GPL-3.0',
    licenseUrl: `${REPO}/blob/${COMMIT}/LICENSE`,
    issue3: `${REPO}/issues/3`,
    issue74: `${REPO}/issues/74`,
    frame: FRAME,
    yearRule: 'show a slice only when the event year equals that slice year; no cross-year interval is recorded',
    note: 'Named upstream polygons only. Edited atlas rings and CHGIS prefectures are not included. See docs/historical-basemaps-license.md.',
    files,
  };
  const body =
    '/**\n' +
    ' * Historical polity polygons from aourednik/historical-basemaps.\n' +
    ` * Commit: ${COMMIT}\n` +
    ` * License: GPL-3.0 ${REPO}/blob/${COMMIT}/LICENSE\n` +
    ' * The maintainer added that LICENSE when asked about the data in issue #3.\n' +
    ' * Issue #74 has no maintainer reply and is not treated as a revocation.\n' +
    ' * These are the upstream features. They are not this atlas\'s edited rings and not CHGIS.\n' +
    ' * Coordinates are rounded to 0.1 degree. The page draws a slice only in its own year.\n' +
    ' */\n' +
    '(function () {\n' +
    "  'use strict';\n" +
    `  window.HISTORICAL_BASEMAP = ${JSON.stringify({ commit: COMMIT, slices })};\n` +
    '})();\n';
  return { source, body };
}

async function main(argv) {
  const check = argv.includes('--check');
  const { source, body } = await buildData();
  const sourceText = JSON.stringify(source, null, 2) + '\n';
  if (check) {
    const problems = [];
    if (!fs.existsSync(SOURCE_JSON) || fs.readFileSync(SOURCE_JSON, 'utf8') !== sourceText) {
      problems.push('data/basemap/historical-basemaps/SOURCE.json is out of date');
    }
    if (!fs.existsSync(OUT_JS) || fs.readFileSync(OUT_JS, 'utf8') !== body) {
      problems.push('js/historical_basemap.js is out of date');
    }
    if (problems.length) {
      for (const problem of problems) console.error(`✗ ${problem}`);
      return 1;
    }
    console.log(`✓ Historical basemap matches ${COMMIT} (${source.files.length} slices)`);
    return 0;
  }
  fs.mkdirSync(path.dirname(SOURCE_JSON), { recursive: true });
  fs.writeFileSync(SOURCE_JSON, sourceText);
  fs.writeFileSync(OUT_JS, body);
  console.log(`Wrote ${path.relative(ROOT, OUT_JS)} (${source.files.length} slices)`);
  return 0;
}

if (require.main === module) {
  main(process.argv).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(`✗ ${err.message}`);
      process.exitCode = 1;
    }
  );
}
