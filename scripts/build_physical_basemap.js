#!/usr/bin/env node
/**
 * Builds js/physical_basemap.js from Natural Earth 1:50m physical layers.
 *
 * Source of record: data/basemap/natural-earth/ and data/basemap/SOURCE.json.
 * Terms: https://www.naturalearthdata.com/about/terms-of-use/
 * Tag: https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2
 *
 * Only land, rivers/lake centerlines, and lakes are read. Admin-0 / admin-1
 * boundary files are not inputs. The output is a modern physical coastline
 * and rivers for orientation. It is not a historical border.
 *
 * Usage:
 *   node scripts/build_physical_basemap.js
 *   node scripts/build_physical_basemap.js --check
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'data/basemap/natural-earth');
const SOURCE_JSON = path.join(ROOT, 'data/basemap/SOURCE.json');
const OUT_JS = path.join(ROOT, 'js/physical_basemap.js');

const FILES = {
  land: 'ne_50m_land.geojson',
  rivers: 'ne_50m_rivers_lake_centerlines.geojson',
  lakes: 'ne_50m_lakes.geojson',
};

// Map frame is 66–142°E, 14–55°N. Keep geometry that meets a slightly wider box.
const WEST = 64;
const EAST = 144;
const SOUTH = 12;
const NORTH = 57;

const EXPECTED = {
  dataset: 'Natural Earth',
  version: '5.1.2',
  scale: '1:50m',
  terms: 'https://www.naturalearthdata.com/about/terms-of-use/',
  repository: 'https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2',
  retrieved: '2026-11-10',
  layers: ['ne_50m_land', 'ne_50m_rivers_lake_centerlines', 'ne_50m_lakes'],
  excluded: ['admin-0', 'admin-1', 'historical boundaries'],
  note: 'Modern physical coastline, rivers, and lakes for orientation. Not a historical border. Natural Earth states that the vector data on its site is in the public domain.',
};

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walkCoords(coords, out) {
  if (!coords || !coords.length) return;
  if (typeof coords[0] === 'number') {
    out.push(coords);
    return;
  }
  for (const part of coords) walkCoords(part, out);
}

function bboxOverlaps(coords) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of coords) {
    const x = pt[0];
    const y = pt[1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return maxX >= WEST && minX <= EAST && maxY >= SOUTH && minY <= NORTH;
}

function roundRing(ring, closed) {
  const out = [];
  for (const pt of ring) {
    const x = Math.round(pt[0] * 10) / 10;
    const y = Math.round(pt[1] * 10) / 10;
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== x || prev[1] !== y) out.push([x, y]);
  }
  if (closed && out.length >= 3) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  }
  return out;
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function linesOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

function loadCollection(name) {
  const text = fs.readFileSync(path.join(SRC_DIR, name), 'utf8');
  const json = JSON.parse(text);
  if (!json || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    throw new Error(`${name} is not a FeatureCollection`);
  }
  return json;
}

function buildData() {
  const hashes = {};
  for (const name of Object.values(FILES)) {
    const buf = fs.readFileSync(path.join(SRC_DIR, name));
    hashes[name] = sha256(buf);
  }

  const land = [];
  for (const feature of loadCollection(FILES.land).features) {
    for (const polygon of polygonsOf(feature.geometry)) {
      const flat = [];
      walkCoords(polygon, flat);
      if (!bboxOverlaps(flat)) continue;
      const rings = polygon
        .map((ring) => roundRing(ring, true))
        .filter((ring) => ring.length >= 4);
      if (rings.length) land.push(rings);
    }
  }

  const rivers = [];
  for (const feature of loadCollection(FILES.rivers).features) {
    const lines = [];
    const flat = [];
    for (const line of linesOf(feature.geometry)) {
      walkCoords(line, flat);
      const rounded = roundRing(line, false);
      if (rounded.length >= 2) lines.push(rounded);
    }
    if (!lines.length || !bboxOverlaps(flat)) continue;
    const rank = Number(feature.properties && feature.properties.scalerank);
    rivers.push({
      name: (feature.properties && feature.properties.name) || '',
      rank: rank <= 1 ? 1 : rank <= 3 ? 2 : 4,
      lines,
    });
  }

  const lakes = [];
  for (const feature of loadCollection(FILES.lakes).features) {
    const rings = [];
    const flat = [];
    for (const polygon of polygonsOf(feature.geometry)) {
      walkCoords(polygon, flat);
      for (const ring of polygon) {
        const rounded = roundRing(ring, true);
        if (rounded.length >= 4) rings.push(rounded);
      }
    }
    if (!rings.length || !bboxOverlaps(flat)) continue;
    lakes.push({
      name: (feature.properties && feature.properties.name) || '',
      rank: 2,
      rings,
    });
  }

  if (!land.length || !rivers.length || !lakes.length) {
    throw new Error('physical basemap lost a layer while clipping to the map frame');
  }

  const source = {
    ...EXPECTED,
    files: Object.values(FILES).map((name) => ({
      name,
      sha256: hashes[name],
    })),
    frame: { west: WEST, east: EAST, south: SOUTH, north: NORTH },
    counts: { land: land.length, rivers: rivers.length, lakes: lakes.length },
  };

  const payload = {
    land,
    rivers,
    lakes,
  };
  const body =
    '/**\n' +
    ' * Modern physical basemap for orientation. Not a historical border.\n' +
    ' * Natural Earth 1:50m vector data, version 5.1.2.\n' +
    ` * Terms: ${EXPECTED.terms}\n` +
    ` * Repository: ${EXPECTED.repository}\n` +
    ' * Layers: ne_50m_land, ne_50m_rivers_lake_centerlines, ne_50m_lakes.\n' +
    ' * Political boundary themes are not included.\n' +
    ` * SHA-256: ${Object.values(FILES).map((name) => `${name}=${hashes[name]}`).join(' ')}\n` +
    ' * Natural Earth states that all versions of its raster and vector map data on its website are in the public domain.\n' +
    ' */\n' +
    '(function () {\n' +
    "  'use strict';\n" +
    '  window.ATLAS_EDITION = {\n' +
    "    id: 'reduced-physical-2026-11',\n" +
    '    historicalBoundaries: false,\n' +
    '    terrainRelief: false,\n' +
    '    modernProvinces: false,\n' +
    '    neighbors: false,\n' +
    '    historicalHydro: false\n' +
    '  };\n' +
    `  window.PHYSICAL_BASEMAP = ${JSON.stringify(payload)};\n` +
    '})();\n';

  return { source, body };
}

function main(argv) {
  const check = argv.includes('--check');
  const { source, body } = buildData();
  const sourceText = JSON.stringify(source, null, 2) + '\n';
  if (check) {
    const problems = [];
    if (fs.readFileSync(SOURCE_JSON, 'utf8') !== sourceText) problems.push('data/basemap/SOURCE.json is out of date');
    if (fs.readFileSync(OUT_JS, 'utf8') !== body) problems.push('js/physical_basemap.js is out of date');
    if (problems.length) {
      for (const problem of problems) console.error(`✗ ${problem}`);
      return 1;
    }
    console.log(`✓ Physical basemap matches Natural Earth ${EXPECTED.version} (${source.counts.land} land, ${source.counts.rivers} rivers, ${source.counts.lakes} lakes)`);
    return 0;
  }
  fs.writeFileSync(SOURCE_JSON, sourceText);
  fs.writeFileSync(OUT_JS, body);
  console.log(`Wrote ${path.relative(ROOT, OUT_JS)} (${source.counts.land} land, ${source.counts.rivers} rivers, ${source.counts.lakes} lakes)`);
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

module.exports = { buildData };
