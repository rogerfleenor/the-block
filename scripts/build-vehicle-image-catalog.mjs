#!/usr/bin/env node
/**
 * Builds data/vehicleImageCatalog.json — Wikimedia Commons photos per
 * **make|model** (not per year), with a reference year parsed from each file
 * name when possible. At runtime, images closest to the lot's model year
 * are preferred so galleries match **year + make + model** as closely as
 * Commons search allows.
 *
 *   node scripts/build-vehicle-image-catalog.mjs
 *   node scripts/patch-vehicle-images.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogKey } from './lib/vehicleImageCatalog.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const vehiclesPath = resolve(scriptDir, '../data/vehicles.json');
const outPath = resolve(scriptDir, '../data/vehicleImageCatalog.json');

const UA =
  'TheBlockCatalog/1.0 (educational vehicle demo; local) https://github.com/anysphere/everysphere';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Record<string, string[]>} */
const MAKE_ALIASES = {
  Ram: ['ram', 'dodge'],
  Volkswagen: ['volkswagen', 'vw'],
};

function makeHints(make) {
  const m = make.toLowerCase();
  const extra = (MAKE_ALIASES[make] ?? []).map((s) => s.toLowerCase());
  return [m, ...extra];
}

function textMatchesMake(title, url, make) {
  const t = `${title} ${url}`.toLowerCase();
  return makeHints(make).some((h) => h.length >= 2 && t.includes(h));
}

function textMatchesModel(title, url, model) {
  const t = `${title} ${url}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  const m = model.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (m.length < 3) return true;
  return t.includes(m);
}

function parseRefYearFromTitle(title, sampleYear) {
  const matches = title.match(/\b(19[6-9]\d|20\d{2})\b/g);
  if (!matches?.length) return null;
  const years = matches
    .map(Number)
    .filter((y) => y >= 1960 && y <= Math.max(sampleYear, new Date().getFullYear()) + 1);
  if (!years.length) return null;
  years.sort((a, b) => Math.abs(a - sampleYear) - Math.abs(b - sampleYear));
  return years[0];
}

async function commonsImageSearch(gsrsearch) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '15',
    gsrsearch,
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '1200',
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
  return res.json();
}

function extractCandidates(apiJson) {
  const pages = apiJson?.query?.pages;
  if (!Array.isArray(pages)) return [];
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const mime = ii.mime ?? '';
    if (!mime.startsWith('image/')) continue;
    const thumb = ii.thumburl;
    const full = ii.url;
    const u = thumb && thumb.startsWith('http') ? thumb : full;
    if (u && u.startsWith('http')) {
      out.push({
        url: u.split('?')[0],
        filePage: ii.descriptionurl ?? '',
        title: p.title ?? '',
      });
    }
  }
  return out;
}

function yearRelevanceScore(title, url, sampleYear) {
  const t = `${title} ${url}`;
  if (t.includes(String(sampleYear))) return 20;
  for (const d of [-1, 1, -2, 2, -3, 3, -4, 4]) {
    if (t.includes(String(sampleYear + d))) return 8 - Math.abs(d);
  }
  return 0;
}

function uniqueModelKeys(vehicles) {
  const keys = new Set();
  for (const v of vehicles) {
    keys.add(catalogKey(v.make, v.model));
  }
  return [...keys].sort();
}

function medianYearForModel(vehicles, make, model) {
  const ys = vehicles.filter((v) => v.make === make && v.model === model).map((v) => v.year);
  ys.sort((a, b) => a - b);
  return ys[Math.floor(ys.length / 2)] ?? ys[0] ?? 2020;
}

async function fetchImagesForModel(make, model, sampleYear) {
  const queries = [`${make} ${model} automobile`, `${make} ${model} car`, `${model} ${make}`];

  const seen = new Set();
  /** @type {{ url: string; refYear: number | null; filePage: string; title: string }[]} */
  const picked = [];

  for (const q of queries) {
    if (picked.length >= 12) break;
    let data;
    try {
      data = await commonsImageSearch(q);
    } catch {
      await sleep(300);
      continue;
    }
    await sleep(280);

    const cands = extractCandidates(data).sort(
      (a, b) =>
        yearRelevanceScore(b.title, b.url, sampleYear) -
        yearRelevanceScore(a.title, a.url, sampleYear),
    );

    for (const c of cands) {
      if (picked.length >= 12) break;
      if (seen.has(c.url)) continue;
      const t = `${c.title} ${c.url}`.toLowerCase();
      if (t.includes('logo') && !t.includes('automobile')) continue;
      if (t.endsWith('.svg') || t.includes('.svg')) continue;
      if (!textMatchesMake(c.title, c.url, make)) continue;
      if (!textMatchesModel(c.title, c.url, model)) continue;

      seen.add(c.url);
      picked.push({
        url: c.url,
        refYear: parseRefYearFromTitle(c.title, sampleYear),
        filePage: c.filePage,
        title: c.title,
      });
    }
  }

  return {
    images: picked.map(({ url, refYear, filePage }) => ({ url, refYear, filePage })),
    attribution: picked.map(({ url, refYear, filePage, title }) => ({
      url,
      refYear,
      filePage,
      title,
    })),
  };
}

const raw = readFileSync(vehiclesPath, 'utf-8');
const vehicles = JSON.parse(raw);
const modelKeys = uniqueModelKeys(vehicles);

/** @type {Record<string, { images: unknown[]; attribution?: unknown[] }>} */
const catalog = {};

let i = 0;
for (const key of modelKeys) {
  i += 1;
  const pipe = key.indexOf('|');
  const make = key.slice(0, pipe);
  const model = key.slice(pipe + 1);
  const sampleYear = medianYearForModel(vehicles, make, model);
  process.stdout.write(`[${i}/${modelKeys.length}] ${key} (≈${sampleYear}) … `);
  try {
    const { images, attribution } = await fetchImagesForModel(make, model, sampleYear);
    catalog[key] = { images, attribution };
    console.info(`${images.length} images`);
  } catch (e) {
    console.info(`ERR ${e?.message ?? e}`);
    catalog[key] = { images: [], attribution: [] };
  }
}

writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.info(`\nWrote ${outPath} (${Object.keys(catalog).length} make|model keys)`);
