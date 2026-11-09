// So sánh phát R1 bằng HLS (hls.js) với tải thẳng MP4 720p, cùng video, cùng trình duyệt, cùng máy.
// Mỗi lượt xem 60 giây: thời gian tới khung hình đầu, dung lượng tải, số lần và tổng thời gian dừng đệm, mức HLS đang phát.
// Cần playwright-core, hls.js cài cạnh tệp này và Chrome có sẵn:
//   node so-sanh-video.cjs <tệp.csv> <số lần> <token phiên>
const fs = require('fs');
const { chromium } = require('playwright-core');

const [out, runsArg, token] = process.argv.slice(2);
const runs = Number(runsArg || 3);
const API = 'http://api.hanni.localhost:18080/api';
const WATCH_MS = Number(process.env.WATCH_MS || 60000);
const NETWORKS = {
  'khong-gioi-han': null,
  // Thông số preset Slow 4G của Chrome DevTools.
  'slow-4g': { offline: false, latency: 150, downloadThroughput: (1.6 * 1e6) / 8, uploadThroughput: (0.75 * 1e6) / 8 },
};
const HLS_JS = require.resolve('hls.js/dist/hls.min.js');

async function link() {
  const r = await fetch(`${API}/resources/video-mau/link`, { method: 'POST', headers: { Cookie: `hanni_access=${token}` } });
  const { url } = await r.json();
  return { hls: url, mp4: url.slice(0, url.lastIndexOf('/')) + '/bai-giang-720p.mp4' };
}

async function once(browser, network, kind) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (NETWORKS[network]) await cdp.send('Network.emulateNetworkConditions', NETWORKS[network]);
  let bytes = 0;
  cdp.on('Network.dataReceived', (e) => { bytes += e.encodedDataLength || e.dataLength || 0; });
  await page.setContent('<video id="v" muted playsinline style="width:640px"></video>');
  if (kind === 'hls') await page.addScriptTag({ path: HLS_JS });
  const urls = await link();
  bytes = 0;
  const result = await page.evaluate(async ({ kind, src, watchMs }) => {
    const v = document.getElementById('v');
    const r = { firstFrameMs: null, waits: 0, waitMs: 0, heights: [] };
    let waitingSince = null;
    const t0 = performance.now();
    v.addEventListener('playing', () => {
      if (r.firstFrameMs === null) r.firstFrameMs = Math.round(performance.now() - t0);
      if (waitingSince !== null) { r.waitMs += performance.now() - waitingSince; waitingSince = null; }
    });
    v.addEventListener('waiting', () => { if (r.firstFrameMs !== null) { r.waits += 1; waitingSince = performance.now(); } });
    if (kind === 'hls') {
      const hls = new Hls();
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => r.heights.push(hls.levels[d.level].height));
      hls.loadSource(src);
      hls.attachMedia(v);
    } else {
      v.src = src;
      r.heights.push(720);
    }
    v.play().catch(() => {});
    await new Promise((res) => setTimeout(res, watchMs));
    if (waitingSince !== null) r.waitMs += performance.now() - waitingSince;
    r.played = Math.round(v.currentTime * 10) / 10;
    r.waitMs = Math.round(r.waitMs);
    return r;
  }, { kind, src: urls[kind], watchMs: WATCH_MS });
  await ctx.close();
  return { ...result, bytes };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  fs.writeFileSync(out, 'lan,mang,dang,khung_dau_ms,byte_tai,so_lan_dung_dem,tong_dung_dem_ms,giay_da_phat,muc_chat_luong\n');
  for (let run = 1; run <= runs; run++) {
    for (const network of Object.keys(NETWORKS)) {
      for (const kind of ['hls', 'mp4']) {
        const r = await once(browser, network, kind);
        const row = [run, network, kind, r.firstFrameMs, r.bytes, r.waits, r.waitMs, r.played, [...new Set(r.heights)].join('>') || ''];
        fs.appendFileSync(out, row.join(',') + '\n');
        console.log(row.join(','));
      }
    }
  }
  await browser.close();
})().catch((e) => { console.error('LỖI', e.message); process.exit(1); });
