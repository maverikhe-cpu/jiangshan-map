'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { verifyIndexHtmlAssetHashes } = require('../sync_version');

async function runCoreDataSuite(ctx) {
  const {
    ROOT,
    JS_DIR,
    FAST_MODE,
    sandbox,
    ControllerClass,
    controllerBundles,
    ctrl,
    provinces,
    snapshots,
    snapKeys,
    bootSnaps,
    dynasties,
    corridors,
    loreData,
    enLocale,
    hydro,
    indexHtml,
    styleCss,
    appCode,
    sitemapXml,
    robotsTxt,
    llmsTxtPath,
    skillMdPath,
    skillPyPath,
    llmsTxt,
    qingDyn,
    pointInShape,
  } = ctx;

  assert(
    loreData &&
      Array.isArray(loreData.CHINESE_ERA_SPANS) &&
      loreData.CHINESE_ERA_SPANS.length >= 100 &&
      Array.isArray(loreData.PLACE_LANDMARK_EVENTS) &&
      loreData.PLACE_LANDMARK_EVENTS.length >= 60 &&
      Array.isArray(loreData.HISTORICAL_JOURNEYS) &&
      loreData.HISTORICAL_JOURNEYS.length === 8 &&
      loreData.HISTORICAL_JOURNEYS.some((j) => j.key === 'linshi-daxue') &&
      Array.isArray(loreData.STRATEGIC_PASSES) &&
      loreData.STRATEGIC_PASSES.length >= 18,
    'ATLAS_LORE_DATA must provide era spans, landmark events, strategic passes, and 8 historical journeys'
  );
  for (const p of loreData.STRATEGIC_PASSES) {
    assert(
      p.key && p.ancientZh && p.ancientEn && Array.isArray(p.coord) && p.coord.length === 2,
      `Invalid strategic pass entry: ${JSON.stringify(p)}`
    );
    const [lng, lat] = p.coord;
    assert(
      lng >= 70 && lng <= 135 && lat >= 18 && lat <= 50,
      `Out-of-bounds pass coordinate [${lng}, ${lat}] for ${p.ancientZh}`
    );
  }

  // 1b. Historical river courses and paleo-coasts are not published. The orientation layer is Natural Earth.
  assert(
    hydro &&
      Array.isArray(hydro.rivers) &&
      hydro.rivers.length === 0 &&
      Array.isArray(hydro.lakes) &&
      hydro.lakes.length === 0 &&
      Array.isArray(hydro.labels) &&
      hydro.labels.length === 0 &&
      Array.isArray(hydro.paleoSea) &&
      hydro.paleoSea.length === 0,
    'HYDRO_DATA must stay empty; the old river, lake, and paleo-coast coordinates had no upstream license URL'
  );
  const physical = sandbox.window.PHYSICAL_BASEMAP;
  const edition = sandbox.window.ATLAS_EDITION;
  assert(
    edition &&
      edition.historicalBoundaries === false &&
      edition.upstreamBasemap === true &&
      edition.terrainRelief === false &&
      edition.historicalHydro === false,
    'ATLAS_EDITION must keep edited atlas boundaries unpublished and mark the upstream basemap as the published historical layer'
  );
  const historical = sandbox.window.HISTORICAL_BASEMAP;
  const floorSlice = (year) => {
    let chosen = null;
    for (const slice of (historical && historical.slices) || []) {
      if (slice.year <= year && (!chosen || slice.year > chosen.year)) chosen = slice;
    }
    return chosen;
  };
  const qinSlice = floorSlice(-221);
  const warlordSlice = floorSlice(1938);
  const moveSlice = floorSlice(1937);
  const tangSlice = floorSlice(741);
  assert(
    historical &&
      historical.commit === '4b5039e50d8d2464b065bd76ad6086cd4597108d' &&
      qinSlice &&
      qinSlice.year === -300 &&
      qinSlice.features.some((feature) => feature.name === 'Qin') &&
      !qinSlice.features.some((feature) => feature.name === 'Han Empire') &&
      warlordSlice &&
      warlordSlice.year === 1938 &&
      warlordSlice.features.some((feature) => feature.name === 'Chinese warlords') &&
      moveSlice &&
      moveSlice.year === 1930 &&
      tangSlice &&
      tangSlice.year === 700 &&
      tangSlice.features.some((feature) => feature.name === 'Sui Empire'),
    'The published historical layer must floor to the upstream slice: Qin at -300, Chinese warlords at 1938, and the 700 file for a Tang year'
  );
  const historicalSrc = fs.readFileSync(path.join(__dirname, '../../js/historical_basemap.js'), 'utf8');
  assert(
    historicalSrc.includes('GPL-3.0') &&
      historicalSrc.includes('4b5039e50d8d2464b065bd76ad6086cd4597108d') &&
      !historicalSrc.includes('九原郡') &&
      !historicalSrc.includes('"shape"'),
    'historical_basemap.js must cite GPL-3.0 and the pinned commit, and must not carry edited atlas rings'
  );
  assert(
    physical && Array.isArray(physical.land) && physical.land.length > 0 && Array.isArray(physical.rivers) && Array.isArray(physical.lakes),
    'PHYSICAL_BASEMAP must publish Natural Earth land, rivers, and lakes'
  );
  assert(
    physical.rivers.some((r) => r.name === 'Huang') && physical.rivers.some((r) => r.name === 'Yangtze' || r.name === 'Chang Jiang'),
    'The physical basemap must include the modern Yellow and Yangtze centerlines from Natural Earth'
  );
  const basemapSrc = fs.readFileSync(path.join(__dirname, '../../js/physical_basemap.js'), 'utf8');
  assert(
    basemapSrc.includes('https://www.naturalearthdata.com/about/terms-of-use/') && basemapSrc.includes('ne_50m_land'),
    'physical_basemap.js must cite the Natural Earth terms and the land layer'
  );

  // 2. Modern province outlines are not shipped. DataV/Amap terms do not clearly allow public redistribution.
  assert(Array.isArray(provinces) && provinces.length === 0, `PROVINCE_OUTLINES must be empty, got ${provinces && provinces.length}`);
  const chinaSrc = fs.readFileSync(path.join(__dirname, '../../js/china_geo_data.js'), 'utf8');
  assert(!chinaSrc.includes('110000') && !chinaSrc.includes('100000_JD'), 'china_geo_data.js must not carry DataV province adcodes');
  assert(chinaSrc.includes('window.HYDRO_DATA'), 'china_geo_data.js must still publish hydrography');
  const provRingCount = 0;

  // 3. Validate historical dynasties, phases, settlements, and snapshot references
  assert(Array.isArray(dynasties) && dynasties.length === 18, `Expected 18 dynasties, got ${dynasties && dynasties.length}`);
  assert.strictEqual(dynasties[0].fromYear, -403, 'Timeline must start at 403 BCE (-403)');
  assert(dynasties[dynasties.length - 1].toYear >= 2026, 'Timeline must cover up to present (2026)');

  let totalSettlements = 0;
  let totalMilestones = 0;
  const referencedSnaps = new Set();

  for (let i = 0; i < dynasties.length; i++) {
    const d = dynasties[i];
    assert(d.key && d.title && d.fromYear < d.toYear, `Invalid dynasty span for ${d.key}`);
    if (d.snapKey) referencedSnaps.add(d.snapKey);
    for (const ph of d.phases || []) {
      const sk = ph.snap || ph.snapKey;
      assert(sk && snapshots[sk], `Dynasty ${d.key} references missing snapshot: ${sk}`);
      referencedSnaps.add(sk);
    }
    for (const s of d.settlements || []) {
      totalSettlements++;
      assert(s.ancient && Array.isArray(s.coord) && s.coord.length === 2, `Invalid settlement in ${d.key}: ${JSON.stringify(s)}`);
      const [lng, lat] = s.coord;
      assert(lng >= 60 && lng <= 145 && lat >= 10 && lat <= 60, `Out-of-bounds settlement coordinate [${lng}, ${lat}] for ${s.ancient}`);
    }
    for (const m of d.milestones || []) {
      totalMilestones++;
      assert(typeof m.year === 'number' && m.headline, `Invalid milestone in ${d.key}: ${JSON.stringify(m)}`);
      assert(
        m.year >= d.fromYear && m.year <= d.toYear,
        `Milestone year ${m.year} out of bounds [${d.fromYear}, ${d.toYear}] in ${d.key}: ${m.headline}`
      );
      const mk = `${d.key}:${m.year}`;
      assert(
        enLocale.milestones && enLocale.milestones[mk],
        `Missing English milestone translation for ${mk} (${m.headline})`
      );
      assert(
        m.headline.length >= 8 && m.headline.length <= 32,
        `Milestone ${mk} zh headline length ${m.headline.length} outside [8, 32]: ${m.headline}`
      );
      const enHeadline = enLocale.milestones[mk][0] || '';
      assert(
        enHeadline.length >= 24 && enHeadline.length <= 96,
        `Milestone ${mk} en headline length ${enHeadline.length} outside [24, 96]: ${enHeadline}`
      );
    }
    assert(enLocale.dynasties && enLocale.dynasties[d.key], `Missing English translation for dynasty ${d.key}`);
  }

  // 3b. Validate 1864 Fall of the Taiping Heavenly Kingdom milestone & s_qing_e4 transition
  assert(
    qingDyn && qingDyn.milestones.some((m) => m.year === 1864 && m.headline.includes('太平天国')),
    'Qing dynasty must include the 1864 Fall of the Taiping Heavenly Kingdom milestone'
  );
  assert(
    snapshots.s_qing_e4 &&
      snapshots.s_qing_e4.polities.some((p) => p.title === '太平天国') &&
      !snapshots.s_qing_f.polities.some((p) => p.title === '太平天国'),
    's_qing_e4 (1860-1864) must retain Taiping Heavenly Kingdom while s_qing_f (1864+) removes it'
  );

  // 4. Published bundles keep snapshot records and omit polygon coordinates.
  assert(snapKeys.length >= 100, `Expected >= 100 snapshots, got ${snapKeys.length}`);
  const decodedPolygons = 0;
  const totalVertices = 0;
  let publishedShapes = 0;
  for (const snap of Object.values(snapshots)) {
    const groups = Array.isArray(snap) ? [snap] : [snap && snap.polities, snap && snap.prefectures, snap && snap.regions];
    for (const group of groups) {
      for (const item of group || []) {
        if (item && item.shape) publishedShapes++;
      }
    }
  }
  assert.strictEqual(publishedShapes, 0, 'Published snapshots must not carry polygon coordinates');
  assert(Array.isArray(snapshots.neighbors) && snapshots.neighbors.length === 0, 'Modern neighbour outlines are not in the published bundle');

  // 4a. Place records stay. Boundary containment is not claimed when the outline is withheld.
  const tangPol = snapshots.s_tang_b.polities.find((p) => p.title === '唐');
  const mingPol = snapshots.s_ming_a.polities.find((p) => p.title === '明');
  const qingEarlyPol = snapshots.s_qing_d.polities.find((p) => p.title === '清');
  const qingLatePol = snapshots.s_qing_e2.polities.find((p) => p.title === '清');
  assert(
    tangPol && mingPol && qingEarlyPol && qingLatePol && !tangPol.shape && !mingPol.shape && !qingEarlyPol.shape && !qingLatePol.shape,
    'Tang, Ming, and Qing polity records remain, without a published boundary'
  );
  const tangDynForDengzhou = dynasties.find((d) => d.key === 'tang');
  const dengzhouSettle = tangDynForDengzhou && tangDynForDengzhou.settlements.find((s) => s.ancient === '登州');
  assert(
    dengzhouSettle && JSON.stringify(dengzhouSettle.coord) === JSON.stringify([120.76, 37.8]),
    'Dengzhou (Penglai) settlement must stay at [120.76, 37.8]'
  );
  const qingEarlyTw = snapshots.s_qing_d.regions.find((r) => r.title === '台湾');
  const qingLateTw = snapshots.s_qing_e2.regions.find((r) => r.title === '台湾');
  assert(
    qingEarlyTw && qingLateTw && !qingEarlyTw.shape && !qingLateTw.shape,
    'Taiwan region records remain, without a published boundary'
  );
  for (const d of dynasties) {
    const snap = snapshots[d.snapKey];
    if (!snap || !Array.isArray(snap.polities)) continue;
    for (const s of d.settlements || []) {
      const [sx, sy] = s.coord;
      assert(
        sx >= 30 && sx <= 180 && sy >= -15 && sy <= 85,
        `Settlement ${s.ancient} (${s.modern}) at [${sx}, ${sy}] in dynasty ${d.key} is outside the atlas frame`
      );
    }
  }

  // 4b. Validate split-era intermediate phase granularity (donghan, xijin, dongjin, nanbei, wudai)
  assert(
    snapshots.s_donghan_d1 &&
      snapshots.s_donghan_d2 &&
      snapshots.s_donghan_e0 &&
      snapshots.s_xijin_a2 &&
      snapshots.s_dongjin_d0 &&
      snapshots.s_dongjin_d1 &&
      snapshots.s_nanbei_a2 &&
      snapshots.s_nanbei_d1 &&
      snapshots.s_nanbei_e2 &&
      snapshots.s_wudai_c0 &&
      snapshots.s_wudai_e1,
    'Split eras must provide intermediate snapshots (s_donghan_d1/d2/e0, s_xijin_a2, s_dongjin_d0/d1, s_nanbei_a2/d1/e2, s_wudai_c0/e1)'
  );

  // 5. Validate corridors, i18n, and isolated cold-start boot seed
  assert(Array.isArray(corridors) && corridors.length >= 3, 'Expected >= 3 historical corridors');
  for (const c of corridors) {
    assert(enLocale.corridors && enLocale.corridors[c.key], `Missing English translation for corridor ${c.key}`);
  }
  const zhouExceptions = new Set(['贵州', '北朝幽州', '曹魏徐州', '南阳邓州', '酒泉瓜州']);
  for (const [zhKey, enVal] of Object.entries((enLocale && enLocale.dict) || {})) {
    if (zhKey.length >= 2 && zhKey.length <= 4 && zhKey.endsWith('州') && !zhouExceptions.has(zhKey)) {
      assert(
        /\bZhou\b/.test(enVal),
        `Expected spaced "Xx Zhou" Romanization for historical prefecture "${zhKey}", got "${enVal}"`
      );
    }
  }

  assert(
    bootSnaps &&
      Array.isArray(bootSnaps.neighbors) &&
      bootSnaps.s_zhanguo_a &&
      bootSnaps.s_qin_a &&
      (FAST_MODE
        ? bootSnaps.s_zhanguo_a.polities.length === snapshots.s_zhanguo_a.polities.length &&
          bootSnaps.s_qin_a.prefectures.length === snapshots.s_qin_a.prefectures.length
        : JSON.stringify(bootSnaps.s_zhanguo_a) === JSON.stringify(snapshots.s_zhanguo_a) &&
          JSON.stringify(bootSnaps.s_qin_a) === JSON.stringify(snapshots.s_qin_a)),
    'atlas_boot.js must provide neighbors, s_zhanguo_a, and s_qin_a identical to atlas_snapshots.js for instant first paint'
  );
  if (!FAST_MODE) {
    assert(
      bootSnaps.s_zhanguo_a.polities.length > 0 && !bootSnaps.s_zhanguo_a.polities[0].shape,
      'Boot seed must not publish a polity polygon'
    );
  }

  // 6. Verify Unified Milestone Balloon Auto-Show ("史事浮签") follows #chk-milestones directly & dead code pruned
  assert(
    appCode.includes('_syncAutoMilestoneBalloon') &&
      appCode.includes('ep-close') &&
      !appCode.includes('_buildMilestoneCalloutDom') &&
      !appCode.includes('toggleEventCallouts') &&
      !appCode.includes('toggleGenealogyMode') &&
      !appCode.includes('_startGuqinSynthFallback') &&
      !indexHtml.includes('id="chk-event-callouts"'),
    'app.js & index.html must unify event callouts under #chk-milestones (_syncAutoMilestoneBalloon, ep-close) and remove dead code (chk-event-callouts, toggleEventCallouts, toggleGenealogyMode, _startGuqinSynthFallback)'
  );

  // 6b. Verify Guqin audio tracks are self-hosted same-origin MP3s in assets/audio/ (reachable on mainland China Wi-Fi without upload.wikimedia.org DNS blocking)
  const guqinTracks = (sandbox.window.ATLAS_LORE_DATA && sandbox.window.ATLAS_LORE_DATA.GUQIN_TRACKS) || [];
  assert(guqinTracks.length >= 5, `Expected at least 5 GUQIN_TRACKS, got ${guqinTracks.length}`);
  for (const gt of guqinTracks) {
    assert(
      typeof gt.mp3 === 'string' && gt.mp3.startsWith('assets/audio/') && gt.mp3.endsWith('.mp3'),
      `GUQIN_TRACKS (${gt.zh}) primary mp3 must be a same-origin assets/audio/*.mp3 path, got ${gt.mp3}`
    );
    const audioPath = path.join(ROOT, gt.mp3);
    assert(fs.existsSync(audioPath), `Missing self-hosted Guqin audio file: ${gt.mp3}`);
    const audioSize = fs.statSync(audioPath).size;
    assert(audioSize > 100000, `Self-hosted Guqin audio file ${gt.mp3} is unexpectedly small (${audioSize} bytes)`);
  }

  // 6c. Prefecture and first-level region lines are clipped to the snapshot's own polities (#234),
  // so a second coastline or a commandery drawn in lost territory never shows.
  assert(
    indexHtml.includes('<clipPath id="prefecture-clip" clipPathUnits="userSpaceOnUse"><path id="prefecture-clip-path" /></clipPath>') &&
      appCode.includes("shapesGroup.setAttribute('clip-path', 'url(#prefecture-clip)')") &&
      appCode.includes("{ 'clip-path': 'url(#prefecture-clip)' }") &&
      appCode.includes("clipPath.setAttribute('d', ownPaths.join(''))"),
    'index.html & app.js must clip the prefecture layer and region lines to #prefecture-clip (the non-neighbor polities)'
  );

  // 7. Validate PR #7 (pass icon), PR #8 (balloon caret & bookmark toggle tab), and PR #10 (SEO metadata & sitemap)
  assert(
    appCode.includes('A1.25,1.25 0 0,0 -1.25,1.1') &&
      appCode.includes('_syncTogglePaneButton') &&
      appCode.includes('caretDir') &&
      appCode.includes('_syncDocumentSeoMeta') &&
      indexHtml.includes('id="lbl-toggle-pane"') &&
      styleCss.includes('data-caret="left"') &&
      styleCss.includes('.sr-only-seo'),
    'app.js, index.html & style.css must retain 3-merlon pass icon, balloon directional caret, bookmark toggle tab, and SEO meta sync'
  );
  assert(
    indexHtml.includes('application/ld+json') &&
      indexHtml.includes('property="og:title"') &&
      indexHtml.includes('rel="canonical"') &&
      indexHtml.includes('id="seo-atlas-directory"'),
    'index.html must include JSON-LD structured data, Open Graph tags, canonical link, and #seo-atlas-directory'
  );
  assert(fs.existsSync(path.join(ROOT, 'sitemap.xml')), 'Missing sitemap.xml at repository root');
  assert(fs.existsSync(path.join(ROOT, 'robots.txt')), 'Missing robots.txt at repository root');
  assert(
    indexHtml.includes('href="https://deanchen.me/jiangshan-map/"') &&
      indexHtml.includes('"@type": "FAQPage"') &&
      sitemapXml.includes('<loc>https://deanchen.me/jiangshan-map/</loc>') &&
      robotsTxt.includes('User-agent: Baiduspider') &&
      robotsTxt.includes('User-agent: Bytespider') &&
      robotsTxt.includes('Sitemap: https://deanchen.me/jiangshan-map/sitemap.xml') &&
      !indexHtml.toLowerCase().includes('deanchensj.github.io') &&
      !sitemapXml.toLowerCase().includes('deanchensj.github.io') &&
      !robotsTxt.toLowerCase().includes('deanchensj.github.io') &&
      !appCode.toLowerCase().includes('deanchensj.github.io'),
    'SEO/GEO files (index.html, sitemap.xml, robots.txt, app.js) must canonicalize to https://deanchen.me/jiangshan-map/ and allow Baiduspider/Bytespider'
  );
  const topicsDir = path.join(ROOT, 'topics');
  assert(
    fs.existsSync(path.join(topicsDir, 'index.html')),
    'Missing topics/index.html static SEO directory page'
  );
  const expectedTopicFiles = [
    'index.html',
    ...dynasties.map((d) => `${d.key}.html`),
    ...loreData.HISTORICAL_JOURNEYS.map((j) => `journey-${j.key}.html`),
    'dufu-763.html',
    'sushi-exile.html',
    'wentianxiang-lingdingyang.html',
    'hanyu-languan.html',
    'shuihu-jiangzhou.html',
    'xinqiji-jingkou.html',
    'battle-changping.html',
    'battle-chibi.html',
    'battle-feishui.html',
  ];
  for (const tf of expectedTopicFiles) {
    const tfPath = path.join(topicsDir, tf);
    assert(fs.existsSync(tfPath), `Missing static SEO topic page: topics/${tf}`);
    const tfHtml = fs.readFileSync(tfPath, 'utf8');
    const expectedCanon = `https://deanchen.me/jiangshan-map/topics/${tf}`;
    assert(
      tfHtml.includes(`rel="canonical" href="${expectedCanon}"`) &&
        tfHtml.includes('application/ld+json') &&
        !tfHtml.toLowerCase().includes('deanchensj.github.io') &&
        !tfHtml.includes('undefined') &&
        !tfHtml.includes('NaN') &&
        !/\b(zhanguo|xihan|donghan|sanguo|xijin|dongjin|nanbei|wudai|beisong|nansong|roc|prc)\s+Historical/i.test(tfHtml) &&
        sitemapXml.includes(`<loc>${expectedCanon}</loc>`) &&
        indexHtml.includes(expectedCanon),
      `Static topic page topics/${tf} must have canonical ${expectedCanon}, JSON-LD, zero undefined/NaN, clean English naming, and be linked in sitemap.xml and index.html`
    );
  }
  verifyIndexHtmlAssetHashes(ROOT, indexHtml, appCode);

  // 8. Verify AI-Native API (window.atlasAPI: locate / resolvePlace / inspect), PLACE_GAZETTEER, llms.txt & skill
  for (const strayFile of [
    'app.js',
    'atlas_trace.js',
    'atlas_search.js',
    'atlas_api.js',
    'atlas_quiz.js',
    'lore_data.js',
    'lore_core.js',
    'lore_detail.js',
    'map_data.js',
    'china_geo_data.js',
    'atlas_boot.js',
    'atlas_snapshots.js',
    'i18n_dict.js',
    'style.css',
  ]) {
    assert(
      !fs.existsSync(path.join(ROOT, strayFile)),
      `Stray duplicate file "${strayFile}" found at repository root; all runtime scripts and styles must live exclusively under js/ or css/`
    );
  }
  assert(
    !fs.existsSync(path.join(JS_DIR, 'lore_data.js')),
    'Legacy monolithic js/lore_data.js must not exist; lore data is split into js/lore_core.js and js/lore_detail.js'
  );
  assert(fs.existsSync(llmsTxtPath), 'llms.txt must exist in repository root');
  assert(fs.existsSync(skillMdPath), 'skills/jiangshan-atlas/SKILL.md must exist');
  assert(fs.existsSync(skillPyPath), 'skills/jiangshan-atlas/scripts/jiangshan.py must exist');
  assert(
    Array.isArray(loreData.PLACE_GAZETTEER) && loreData.PLACE_GAZETTEER.length >= 100,
    'lore_data.js must provide >= 100 PLACE_GAZETTEER entries with poetic/historical landmarks and city aliases'
  );
  assert(
    appCode.includes('window.atlasAPI') &&
      appCode.includes('resolvePlace(') &&
      appCode.includes('inspect(') &&
      appCode.includes('locate(') &&
      appCode.includes('_parsePlaceTokens(') &&
      appCode.includes('_renderCustomRoute(') &&
      appCode.includes('PLACE_GAZETTEER') &&
      appCode.includes('trace-pin-label') &&
      llmsTxt.includes('?year=') &&
      llmsTxt.includes('window.atlasAPI.locate'),
    'app.js & llms.txt must expose window.atlasAPI (locate, resolvePlace, inspect), multi-stop route rendering, PLACE_GAZETTEER, and URL deep-link protocol'
  );

  const TRACE_METHODS = [
    'toggleGenealogySheetExpand',
    '_clearActiveTrace',
    '_clearActivePerson',
    'closeGenealogyCard',
    '_personSearchAliases',
    '_resolvePersonProfile',
    '_formatPersonSpan',
    '_tailorPersonEvent',
    '_collectPersonEvents',
    '_resolvePersonProfiles',
    '_eventsSharePlace',
    '_buildPersonTracksAndEvents',
    'openPersonChronicle',
    'openJourneyAsPerson',
    '_personAutoplayTick',
    'togglePersonAutoplay',
    'selectPersonEvent',
    '_getSoloStepOriginCoord',
    '_getMultiStepLegs',
    '_getNavigablePersonEventIdxs',
    'stepPersonEvent',
    '_getPersonVisibleTopFrac',
    '_getVisiblePersonTracks',
    '_framePersonOverview',
    '_flyToPersonEvent',
    '_findNearestPersonPin',
    '_renderPersonPinsOverlay',
    '_setHoveredPersonPin',
    '_renderPersonChronicleCard',
    '_renderPersonFooter',
    '_hidePersonFooter',
    '_syncTracedPrefecture',
    '_resolvePlaceLoreBanner',
    '_findNearbyPass',
    '_collectPlaceEventsForDynasty',
    '_findNearestTouchNode',
    '_stripModernProvincePrefix',
    '_resolveModernLocationAt',
    '_getCanonicalPlaces',
    '_findNearestSettlement',
    '_polityAt',
    '_shapeAnchorOrCentroid',
    '_minVertexDistSq',
    '_resolveEraPlaceAt',
    '_resolveModernIdentity',
    'openGenealogyAt',
    '_getCustomRouteVisibleTopFrac',
    '_buildJourneySegmentInfo',
    '_renderCartographicTrajectory',
  ];
  const TRACE_STATIC_PROPS = [
    'PERSON_PROFILES',
    'PERSON_TRACK_PALETTE',
    'PLACE_LANDMARK_EVENTS',
    'STRATEGIC_PASSES',
    'PLACE_GAZETTEER',
    'CITY_LORE',
    'HISTORICAL_JOURNEYS',
  ];
  const SEARCH_METHODS = [
    '_searchPlaceholder',
    '_getSearchSampleQueries',
    '_getSearchShowcasePool',
    '_ensureSearchIndex',
    '_parseChineseNumber',
    '_getCompiledEraSpans',
    '_matchEraResults',
    '_searchBucket',
    '_eventPinyinQuery',
    '_canMatchEventPinyin',
    '_queryQuickSearch',
    '_isDuplicateSearchEvent',
    '_appendEventPinyinResults',
    '_rankQuickSearchResults',
    '_selectSearchResult',
  ];
  const API_METHODS = [
    'clearCustomRoute',
    'selectCustomRouteStop',
    'stepCustomRoute',
    '_renderCustomRouteCard',
    '_parsePlaceList',
    '_parseYearList',
    '_parsePlaceTokens',
    'resolvePlace',
    '_resolvePlaceUncached',
    '_inspectCoord',
    '_drawCustomRouteOverlay',
    '_renderCustomRoute',
    'inspect',
    'locate',
    '_restoreFromQuery',
    '_registerWebMcpTools',
  ];
  const QUIZ_METHODS = [
    '_sanitizeChallengeClue',
    '_buildChallengeDeck',
    '_syncChallengeScrubberState',
    'startChallenge',
    'stopChallenge',
    '_renderChallengeQuestionText',
    'presentChallengeRound',
    '_drawQuizMark',
    '_setQuizChip',
    '_rescaleQuizChip',
    '_quizChipAt',
    '_previewLocatePin',
    '_renderChallengeAnsweredVerdict',
    '_evaluateLocateClick',
    '_finishChallenge',
  ];
  for (const traceMethod of TRACE_METHODS) {
    const desc = Object.getOwnPropertyDescriptor(ControllerClass.prototype, traceMethod);
    assert(
      desc && typeof desc.value === 'function' && desc.enumerable === false,
      `atlas_trace.js must attach ${traceMethod} as a non-enumerable method on HistoricalAtlasController.prototype`
    );
  }
  for (const traceStaticProp of TRACE_STATIC_PROPS) {
    const sDesc = Object.getOwnPropertyDescriptor(ControllerClass, traceStaticProp);
    assert(
      sDesc && (typeof sDesc.get === 'function' || Array.isArray(sDesc.value)),
      `atlas_trace.js must attach static property ${traceStaticProp} onto HistoricalAtlasController`
    );
  }
  for (const searchMethod of SEARCH_METHODS) {
    const desc = Object.getOwnPropertyDescriptor(ControllerClass.prototype, searchMethod);
    assert(
      desc && typeof desc.value === 'function' && desc.enumerable === false,
      `atlas_search.js must attach ${searchMethod} as a non-enumerable method on HistoricalAtlasController.prototype`
    );
  }
  for (const apiMethod of API_METHODS) {
    const desc = Object.getOwnPropertyDescriptor(ControllerClass.prototype, apiMethod);
    assert(
      desc && typeof desc.value === 'function' && desc.enumerable === false,
      `atlas_api.js must attach ${apiMethod} as a non-enumerable method on HistoricalAtlasController.prototype`
    );
  }
  for (const quizMethod of QUIZ_METHODS) {
    const desc = Object.getOwnPropertyDescriptor(ControllerClass.prototype, quizMethod);
    assert(
      desc && typeof desc.value === 'function' && desc.enumerable === false,
      `atlas_quiz.js must attach ${quizMethod} as a non-enumerable method on HistoricalAtlasController.prototype`
    );
  }
  {
    // Verify clean separation: app.js alone must not define any trace, search, api, or quiz mixin methods.
    const appOnlySandbox = { console, addEventListener: () => {} };
    appOnlySandbox.window = appOnlySandbox;
    vm.createContext(appOnlySandbox);
    controllerBundles[0].script.runInContext(appOnlySandbox);
    const BaseClass = appOnlySandbox.window.HistoricalAtlasController;
    for (const m of [...TRACE_METHODS, ...SEARCH_METHODS, ...API_METHODS, ...QUIZ_METHODS]) {
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(BaseClass.prototype, m),
        false,
        `Method ${m} must live in its dedicated mixin module, not in js/app.js`
      );
    }

    // Controller modules must install correctly in either load order.
    const orderSandbox = { console, addEventListener: () => {} };
    orderSandbox.window = orderSandbox;
    vm.createContext(orderSandbox);
    for (const b of [...controllerBundles].reverse()) b.script.runInContext(orderSandbox);
    const ReorderedClass = orderSandbox.window.HistoricalAtlasController;
    assert(
      typeof ReorderedClass === 'function' &&
        TRACE_METHODS.every((m) => typeof ReorderedClass.prototype[m] === 'function') &&
        SEARCH_METHODS.every((m) => typeof ReorderedClass.prototype[m] === 'function') &&
        API_METHODS.every((m) => typeof ReorderedClass.prototype[m] === 'function') &&
        QUIZ_METHODS.every((m) => typeof ReorderedClass.prototype[m] === 'function') &&
        Array.isArray(ReorderedClass.PERSON_TRACK_PALETTE) &&
        ReorderedClass.PERSON_TRACK_PALETTE.length >= 3,
      'atlas_trace.js, atlas_search.js, atlas_api.js, and atlas_quiz.js loaded before app.js must attach all mixin methods via window.__ATLAS_MIXINS'
    );
    assert.strictEqual(
      orderSandbox.window.__ATLAS_MIXINS.length,
      0,
      'app.js must drain window.__ATLAS_MIXINS after defining HistoricalAtlasController'
    );
    const reorderedInst = Object.create(ReorderedClass.prototype);
    reorderedInst.locale = 'zh';
    assert.strictEqual(
      reorderedInst._sanitizeChallengeClue('今淄博城（今山东淄博）', { modern: '' }, '临淄'),
      '此城',
      'Quiz methods installed through the mixin queue must run against the late-bound controller'
    );
    const hitPolity = reorderedInst._polityAt(108.9, 34.2, {
      polities: [
        {
          name: '秦',
          role: 'empire',
          shape: {
            type: 'Polygon',
            coordinates: [[[105, 30], [112, 30], [112, 38], [105, 38], [105, 30]]],
          },
        },
      ],
    });
    assert(
      hitPolity && hitPolity.name === '秦',
      'Trace methods installed through the mixin queue must bind MercatorProjector from the late-bound controller'
    );
    assert(
      reorderedInst
        ._personSearchAliases({ zh: '苏轼', en: 'Su Shi', aliases: ['苏东坡'] })
        .includes('苏东坡'),
      'Trace methods installed through the mixin queue must execute person alias resolution cleanly'
    );
    assert.strictEqual(
      reorderedInst._parseChineseNumber('二十三'),
      23,
      'Search methods installed through the mixin queue must parse Chinese numerals cleanly'
    );
    assert.strictEqual(
      reorderedInst._parsePlaceList('长安, 洛阳 -> 敦煌').join('|'),
      '长安|洛阳|敦煌',
      'API methods installed through the mixin queue must parse multi-stop place lists cleanly'
    );
  }
  {
    const probe = Object.create(ControllerClass.prototype);
    let enumerations = 0;
    const dict = new Proxy({ sample: 'translation' }, {
      ownKeys(target) { enumerations++; return Reflect.ownKeys(target); },
    });
    probe._setEnglishLocale({ dict });
    assert.strictEqual(probe._hasEnDict(), true, 'A loaded dictionary must be available');
    for (let i = 0; i < 20; i++) assert.strictEqual(probe._hasEnDict(), true);
    assert.strictEqual(enumerations, 1, 'Dictionary availability must not rescan on the hot path');
    probe._setEnglishLocale({ dict: {} });
    assert.strictEqual(probe._hasEnDict(), false, 'Replacing with an empty dictionary resets the flag');
    probe._setEnglishLocale(null);
    assert.strictEqual(probe._hasEnDict(), false, 'A missing locale remains supported');
  }
  assert.strictEqual(
    typeof ctrl._lazyAssetUrl,
    'function',
    'HistoricalAtlasController must define _lazyAssetUrl(relPath, datasetKey)'
  );
  {
    const savedDocLazy = sandbox.document;
    const savedWinVers = sandbox.window.ATLAS_ASSET_VERSIONS;
    sandbox.document = {
      getElementById: (id) =>
        id === 'atlas-app-script'
          ? {
              dataset: {
                vSnapshots: 'a1b2c3d4',
                vI18n: 'e5f60718',
                vLore: '11223344',
                vHant: '55667788',
                vQuiz: '99aabbcc',
              },
            }
          : null,
    };
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/atlas_snapshots.js', 'vSnapshots'),
      'js/atlas_snapshots.js?v=a1b2c3d4',
      '_lazyAssetUrl must read data-v-snapshots from #atlas-app-script'
    );
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/i18n_dict.js', 'vI18n'),
      'js/i18n_dict.js?v=e5f60718',
      '_lazyAssetUrl must read data-v-i18n from #atlas-app-script'
    );
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/lore_detail.js', 'vLore'),
      'js/lore_detail.js?v=11223344',
      '_lazyAssetUrl must read data-v-lore from #atlas-app-script'
    );
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/zh_hant.js', 'vHant'),
      'js/zh_hant.js?v=55667788',
      '_lazyAssetUrl must read data-v-hant from #atlas-app-script'
    );
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/atlas_quiz.js', 'vQuiz'),
      'js/atlas_quiz.js?v=99aabbcc',
      '_lazyAssetUrl must read data-v-quiz from #atlas-app-script'
    );
    assert.strictEqual(ctrl._hasZhHant(), true, '_hasZhHant must detect loaded ZH_HANT_CONV');
    assert.strictEqual(ctrl._isQuizLoaded(), true, '_isQuizLoaded must detect installed AtlasQuizMixin');
    sandbox.document = undefined;
    sandbox.window.ATLAS_ASSET_VERSIONS = { vSnapshots: 'deadbeef' };
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/atlas_snapshots.js', 'vSnapshots'),
      'js/atlas_snapshots.js?v=deadbeef',
      '_lazyAssetUrl must support window.ATLAS_ASSET_VERSIONS fallback'
    );
    sandbox.window.ATLAS_ASSET_VERSIONS = null;
    assert.strictEqual(
      ctrl._lazyAssetUrl('js/atlas_snapshots.js', 'vSnapshots'),
      'js/atlas_snapshots.js',
      '_lazyAssetUrl must fall back cleanly to bare path when no hash metadata is present'
    );
    sandbox.document = savedDocLazy;
    sandbox.window.ATLAS_ASSET_VERSIONS = savedWinVers;

    // Verify perf_budget.js first-paint synchronous script gzip budget
    const { measurePerfBudget, readBaseline: readPerfBaseline } = require('../perf_budget');
    const perfReport = measurePerfBudget(ROOT);
    const perfBaseline = readPerfBaseline(ROOT);
    assert(
      perfBaseline && typeof perfBaseline.maxSyncScriptsGzipBytes === 'number',
      'data/atlas/perf_baseline.json must exist and define maxSyncScriptsGzipBytes'
    );
    assert(
      perfReport.syncScriptsGzipBytes <= perfBaseline.maxSyncScriptsGzipBytes,
      `Synchronous first-paint script gzip sum (${perfReport.syncScriptsGzipBytes} B) exceeds budget ceiling (${perfBaseline.maxSyncScriptsGzipBytes} B)`
    );
    assert(
      perfReport.syncScripts.some((s) => s.relPath === 'js/lore_core.js') &&
        !perfReport.syncScripts.some((s) => s.relPath === 'js/lore_detail.js') &&
        !perfReport.syncScripts.some((s) => s.relPath === 'js/zh_hant.js') &&
        !perfReport.syncScripts.some((s) => s.relPath === 'js/atlas_quiz.js') &&
        perfReport.lazyScripts.some((s) => s.relPath === 'js/lore_detail.js') &&
        perfReport.lazyScripts.some((s) => s.relPath === 'js/zh_hant.js') &&
        perfReport.lazyScripts.some((s) => s.relPath === 'js/atlas_quiz.js'),
      'index.html must load js/lore_core.js synchronously and defer js/lore_detail.js, js/zh_hant.js, and js/atlas_quiz.js as lazy bundles'
    );
  }


  ctx.stats.provRingCount = provRingCount;
  ctx.stats.totalSettlements = totalSettlements;
  ctx.stats.totalMilestones = totalMilestones;
  ctx.stats.referencedSnaps = referencedSnaps;
  ctx.stats.decodedPolygons = decodedPolygons;
  ctx.stats.totalVertices = totalVertices;
}

module.exports = { runCoreDataSuite };
