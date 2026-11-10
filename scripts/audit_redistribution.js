#!/usr/bin/env node
/**
 * Fails if a public bundle can again carry a restricted layer:
 *   - a non-empty prefecture list
 *   - a ring whose hash is on data/atlas/restricted_ring_hashes.json
 *   - DataV/Amap modern province outlines (adcodes 110000 / 100000_JD)
 *   - prefecture titles that this distribution already dropped (直隶厅, 九原郡)
 *
 * The hash list is not coordinates. This script does not download or rebuild CHGIS or DataV.
 *
 * Usage: node scripts/audit_redistribution.js --check
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadSources } = require('./build_atlas');

const ROOT = path.resolve(__dirname, '..');

function main(argv) {
  const check = argv.includes('--check');
  const problems = [];
  try {
    loadSources(ROOT);
  } catch (err) {
    problems.push(err.message);
  }

  const china = fs.readFileSync(path.join(ROOT, 'js/china_geo_data.js'), 'utf8');
  if (!/window\.PROVINCE_OUTLINES\s*=\s*\[\];/.test(china)) {
    problems.push('js/china_geo_data.js must keep PROVINCE_OUTLINES empty');
  }
  if (china.includes('110000') || china.includes('100000_JD')) {
    problems.push('js/china_geo_data.js still contains DataV province adcodes');
  }
  if (!/window\.HYDRO_DATA\s*=/.test(china)) problems.push('js/china_geo_data.js must still publish an empty HYDRO_DATA object');
  if (/const HR\s*=/.test(china) || /paleoSea:\s*PS/.test(china)) {
    problems.push('js/china_geo_data.js still publishes the uncited river, lake, or coastline payload');
  }

  const physical = fs.readFileSync(path.join(ROOT, 'js/physical_basemap.js'), 'utf8');
  if (!physical.includes('https://www.naturalearthdata.com/about/terms-of-use/')) {
    problems.push('js/physical_basemap.js must cite the Natural Earth terms');
  }
  if (!physical.includes('ne_50m_land') || physical.includes('admin_0_countries') || physical.includes('ne_50m_admin')) {
    problems.push('js/physical_basemap.js must be the physical land layer and must not carry admin boundaries');
  }
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/basemap/SOURCE.json'), 'utf8'));
  if (source.version !== '5.1.2' || source.terms !== 'https://www.naturalearthdata.com/about/terms-of-use/') {
    problems.push('data/basemap/SOURCE.json does not record Natural Earth 5.1.2 terms');
  }

  for (const rel of ['js/atlas_boot.js', 'js/atlas_snapshots.js']) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (text.includes('"title":"九原郡"') || text.includes('"title":"直隶厅"') || text.includes('直隶厅')) {
      problems.push(`${rel} still contains a removed prefecture feature`);
    }
    if (text.includes('110000')) problems.push(`${rel} contains a modern province adcode`);
    if (!text.includes('"r":[]') || text.includes('"shape"')) {
      problems.push(`${rel} still publishes polygon coordinates`);
    }
  }

  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    return 1;
  }
  console.log(
    check
      ? '✓ Public bundles omit prefecture geometry, known CHGIS-derived rings, and DataV province outlines'
      : '✓ Redistribution audit passed'
  );
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
