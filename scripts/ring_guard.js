#!/usr/bin/env node
/**
 * Blocks rings already identified as CHGIS prefecture derivatives.
 * The denylist stores hashes only. It does not contain coordinates and it
 * cannot rebuild the omitted mesh.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DENYLIST_PATH = 'data/atlas/restricted_ring_hashes.json';

function hundredths(v) {
  const n = Number(v);
  return Math.round(n * 100 + (n >= 0 ? 1e-8 : -1e-8));
}

function normRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const pts = [];
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) return null;
    pts.push([hundredths(pt[0]), hundredths(pt[1])]);
  }
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts.pop();
  }
  const cleaned = [];
  for (const p of pts) {
    const prev = cleaned[cleaned.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) cleaned.push(p);
  }
  if (cleaned.length < 3) return null;
  const rotate = (seq) => {
    let i = 0;
    for (let k = 1; k < seq.length; k++) {
      if (seq[k][0] < seq[i][0] || (seq[k][0] === seq[i][0] && seq[k][1] < seq[i][1])) i = k;
    }
    return seq.slice(i).concat(seq.slice(0, i));
  };
  const cmp = (a, b) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i][0] !== b[i][0]) return a[i][0] - b[i][0];
      if (a[i][1] !== b[i][1]) return a[i][1] - b[i][1];
    }
    return 0;
  };
  const a = rotate(cleaned);
  const b = rotate(cleaned.slice().reverse());
  const best = cmp(a, b) <= 0 ? a : b;
  return best.map((p) => `${p[0]},${p[1]}`).join(';');
}

function hashSig(sig) {
  return crypto.createHash('sha256').update(sig).digest('hex');
}

let denylist = null;
function denylistSet(rootDir = ROOT) {
  if (!denylist) {
    const data = JSON.parse(fs.readFileSync(path.join(rootDir, DENYLIST_PATH), 'utf8'));
    if (!Array.isArray(data.hashes) || !data.hashes.length) {
      throw new Error(`${DENYLIST_PATH} is missing its hash list`);
    }
    denylist = new Set(data.hashes);
  }
  return denylist;
}

function eachOuterAndHole(geometry, visit) {
  if (!geometry || typeof geometry !== 'object') return;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : null;
  if (!polygons) return;
  for (const poly of polygons) {
    if (!Array.isArray(poly)) continue;
    for (const ring of poly) visit(ring);
  }
}

/** Returns a short hash prefix when geometry contains a denied ring, else null. */
function bannedRing(geometry, rootDir = ROOT) {
  const banned = denylistSet(rootDir);
  let hit = null;
  eachOuterAndHole(geometry, (ring) => {
    if (hit) return;
    const sig = normRing(ring);
    if (!sig) return;
    const hash = hashSig(sig);
    if (banned.has(hash)) hit = hash.slice(0, 12);
  });
  return hit;
}

module.exports = {
  DENYLIST_PATH,
  bannedRing,
  denylistSet,
  hashSig,
  normRing,
};
