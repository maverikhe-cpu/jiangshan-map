/**
 * Historical Atlas Boot Seed (Lossless Topology-Deduplicated & Lazy VLQ-Decoded)
 */
(function () {
  'use strict';
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';
  const R = new Uint8Array(128);
  for (let i = 0; i < 64; i++) R[A.charCodeAt(i)] = i;
  const D = {"r":[],"f":[{"title":"周","role":"rival","tint":"#b8860b","anchor":[112.05,34.86]},{"title":"南越","tint":null,"role":"neighbor","anchor":[106.17,21.33]},{"title":"狮子国","tint":null,"role":"neighbor","anchor":[80.73,7.62]},{"title":"安息","tint":null,"role":"neighbor","anchor":[59.38,34.85]},{"title":"大食诸部","tint":null,"role":"neighbor","anchor":[58.84,22.04]},{"title":"大夏（巴克特里亚）","tint":null,"role":"neighbor","anchor":[67.86,33.24]},{"title":"北亚诸部","tint":null,"role":"neighbor","anchor":[77.82,10.95]},{"title":"孔雀帝国","tint":null,"role":"neighbor","anchor":[75.97,22.51]},{"title":"阿伊努","tint":null,"role":"neighbor","anchor":[143.26,43.52]},{"title":"北亚林中诸部","tint":null,"role":"neighbor","anchor":[63.66,59.19]},{"title":"匈奴","tint":null,"role":"neighbor","anchor":[109.94,44.17]},{"title":"泰人诸部","tint":null,"role":"neighbor","anchor":[101.79,26.24]},{"title":"孟—高棉诸部","tint":null,"role":"neighbor","anchor":[105.47,10.46]},{"title":"马来诸国","tint":null,"role":"neighbor","anchor":[116.19,4.44]},{"title":"塞琉古（条支）","tint":null,"role":"neighbor","anchor":[59.26,28.26]},{"title":"月氏","tint":null,"role":"neighbor","anchor":[89.2,39.17]},{"title":"斯基泰","tint":null,"role":"neighbor","anchor":[71,48.83]},{"title":"丁零诸部","tint":null,"role":"neighbor","anchor":[95.55,52.96]},{"title":"通古斯诸部","tint":null,"role":"neighbor","anchor":[131.41,43.4]},{"title":"象雄","tint":null,"role":"neighbor","anchor":[79.82,32.35]},{"title":"阿拉干","tint":null,"role":"neighbor","anchor":[92.34,21.76]},{"title":"岛夷诸部","tint":null,"role":"neighbor","anchor":[120.81,23.51]},{"title":"南越","tint":null,"role":"neighbor","anchor":[109.5,23.2]},{"title":"闽越","tint":null,"role":"neighbor","anchor":[118.32,24.48]}],"d":{"neighbors":[],"s_zhanguo_a":{"caption":"战国初期（前403—前341年 · 三家分晋、田氏代齐与魏霸中原）","note":"前403年周威烈王册命韩、赵、魏为诸侯（《资治通鉴》开篇），前386年田氏代齐，战国七雄格局确立；魏文侯、武侯任李悝、吴起率先称雄中原（西跨洛水置河西郡、上郡），宋、巴、蜀、越、中山、义渠与东周王畿并存。","polities":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],"prefectures":[],"regions":[]},"s_qin_a":{"caption":"前 221 — 前 215 · 秦灭六国初年：北未收河套，南未平百越","note":"州郡政区：历代州部与郡级政区","prefRef":"s_qin","polities":[22,23,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],"regions":[],"prefectures":[]}}};
  const rc = new Array(D.r.length);
  function ring(idx) {
    let r = rc[idx];
    if (r) return r;
    const s = D.r[idx];
    r = [];
    let i = 0, n = s.length, x = 0, y = 0;
    while (i < n) {
      let b, sh = 0, v = 0;
      do { b = R[s.charCodeAt(i++)]; v |= (b & 31) << sh; sh += 5; } while (b >= 32);
      x += (v & 1) ? ~(v >>> 1) : (v >>> 1);
      sh = 0; v = 0;
      do { b = R[s.charCodeAt(i++)]; v |= (b & 31) << sh; sh += 5; } while (b >= 32);
      y += (v & 1) ? ~(v >>> 1) : (v >>> 1);
      r.push([x / 100, y / 100]);
    }
    return (rc[idx] = r);
  }
  const fc = new Array(D.f.length);
  function feat(idx) {
    let f = fc[idx];
    if (f) return f;
    const raw = D.f[idx];
    const sh = raw.shape;
    if (sh) {
      if (sh._p) {
        const ids = sh._p;
        raw.shape = { type: 'Polygon' };
        Object.defineProperty(raw.shape, 'coordinates', {
          enumerable: true,
          configurable: true,
          get() {
            const v = ids.map(ring);
            Object.defineProperty(this, 'coordinates', { value: v, writable: true, enumerable: true, configurable: true });
            return v;
          }
        });
      } else if (sh._m) {
        const ids = sh._m;
        raw.shape = { type: 'MultiPolygon' };
        Object.defineProperty(raw.shape, 'coordinates', {
          enumerable: true,
          configurable: true,
          get() {
            const v = ids.map((p) => p.map(ring));
            Object.defineProperty(this, 'coordinates', { value: v, writable: true, enumerable: true, configurable: true });
            return v;
          }
        });
      }
    }
    return (fc[idx] = raw);
  }
  const out = window.ATLAS_SNAPSHOTS || {};
  for (const [k, s] of Object.entries(D.d)) {
    if (out[k]) continue;
    if (Array.isArray(s)) {
      out[k] = s.map(feat);
    } else if (s && typeof s === 'object') {
      const sc = {};
      for (const [sk, sv] of Object.entries(s)) {
        sc[sk] = (sk === 'polities' || sk === 'prefectures' || sk === 'regions') && Array.isArray(sv) ? sv.map(feat) : sv;
      }
      out[k] = sc;
    }
  }
  window.ATLAS_SNAPSHOTS = out;
})();
