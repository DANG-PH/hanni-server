// Quay video demo từ thao tác thật trên lab bằng Playwright. Mỗi cảnh ra 1 tệp .webm, phụ đề chèn ngay trong trang.
//   node quay-demo.cjs web <thư mục>                          trang học liệu: khách, đăng nhập, video, PDF, bài nghe
//   node quay-demo.cjs grafana <uid> <giây> <thư mục> <phụ đề>  dashboard Grafana trong lúc có tải hoặc sự cố
//   node quay-demo.cjs alert <giây> <thư mục>                  trang Alertmanager
//   node quay-demo.cjs terminal <tệp log> <tiêu đề> <thư mục>  phát lại đúng nội dung lệnh đã chạy, ghi rõ giờ chạy
//   node quay-demo.cjs the <tệp html> <tệp png>                 chụp 1 thẻ tiêu đề
// Biến môi trường: CHROME, PASS (mật khẩu tài khoản giả), GRAFANA_PASS.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SIZE = { width: 1280, height: 720 };
const [mode, ...args] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(dir) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: dir ? { dir, size: SIZE } : undefined, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  return { browser, ctx, page };
}

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__phu_de');
    if (!el) {
      el = document.createElement('div');
      el.id = '__phu_de';
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:14px 28px;background:rgba(11,11,11,.82);color:#fff;font:600 22px/1.35 "Be Vietnam Pro",Arial,sans-serif;pointer-events:none';
      document.documentElement.appendChild(el);
    }
    el.textContent = t;
  }, text).catch(() => {});
}

async function close({ browser, ctx }) {
  await ctx.close();
  await browser.close();
}

async function web(dir) {
  const s = await open(dir);
  const { page } = s;
  const base = 'http://hanni.localhost:3000';
  await page.goto(`${base}/hoc-lieu`, { waitUntil: 'networkidle' });
  await caption(page, 'Khách mở trang Học liệu: 3 tài nguyên, video cần đăng nhập, PDF và bài nghe công khai');
  await sleep(5000);
  await page.getByRole('button', { name: 'Tải về' }).click().catch(() => {});
  await caption(page, 'Tải PDF: API chỉ kiểm quyền và ký liên kết 10 phút, tệp do Nginx phục vụ, không đi qua API');
  await sleep(4000);
  await page.goto(`${base}/hoc-lieu`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Nghe' }).click().catch(() => {});
  await caption(page, 'Nghe bài 1 ngay không cần tài khoản');
  await sleep(5000);
  await page.goto(`${base}/login?next=/hoc-lieu`, { waitUntil: 'networkidle' });
  await caption(page, 'Đăng nhập bằng tài khoản giả loadtest-0001@example.test');
  await page.locator('input[type=email], input[name=email]').first().fill('loadtest-0001@example.test');
  await page.locator('input[type=password]').first().fill(process.env.PASS || '');
  await sleep(1500);
  await page.locator('form button[type=submit]').first().click();
  await page.waitForURL(/hoc-lieu/, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await caption(page, 'Đã đăng nhập: nút "Xem video" thay cho lời mời đăng nhập');
  await sleep(3000);
  await page.getByRole('button', { name: 'Xem video' }).click().catch(() => {});
  await page.waitForSelector('video', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.play(); v.scrollIntoView({ block: 'center' }); } });
  await caption(page, 'Video HLS 2 mức 540p và 720p phát qua hls.js, trình phát tự chọn mức theo mạng');
  await sleep(14000);
  await close(s);
}

async function grafana(uid, seconds, dir, text) {
  const s = await open(dir);
  const { page } = s;
  await page.goto('http://grafana.hanni.localhost:18080/login', { waitUntil: 'networkidle' });
  await page.locator('input[name=user]').fill('admin');
  await page.locator('input[name=password]').fill(process.env.GRAFANA_PASS || '');
  await page.locator('button[type=submit]').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.goto(`http://grafana.hanni.localhost:18080/d/${uid}?orgId=1&refresh=5s&from=now-10m&to=now&kiosk`, { waitUntil: 'networkidle' }).catch(() => {});
  await caption(page, text);
  await sleep(Number(seconds) * 1000);
  await close(s);
}

async function alert(seconds, dir) {
  const s = await open(dir);
  const { page } = s;
  await page.goto('http://alertmanager.hanni.localhost:18080/#/alerts', { waitUntil: 'networkidle' }).catch(() => {});
  await caption(page, 'Alertmanager: cảnh báo đang bật sau khi dừng hẳn API');
  for (let t = 0; t < Number(seconds); t += 5) {
    await sleep(5000);
    await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
    await caption(page, 'Alertmanager: cảnh báo đang bật sau khi dừng hẳn API');
  }
  await close(s);
}

async function terminal(logFile, title, dir) {
  const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter((l) => l.trim()).slice(0, 26);
  const s = await open(dir);
  const { page } = s;
  await page.setContent(`<body style="margin:0;background:#101418;color:#d8dee9;font:18px/1.5 'DejaVu Sans Mono',monospace">
    <div style="padding:22px 32px;background:#1c232b;color:#fff;font:600 22px 'Be Vietnam Pro',Arial,sans-serif">${title}</div>
    <pre id="o" style="margin:0;padding:22px 32px;white-space:pre-wrap"></pre></body>`);
  for (const l of lines) {
    await page.evaluate((x) => { document.getElementById('o').textContent += x + '\n'; }, l);
    await sleep(Math.min(900, 250 + l.length * 6));
  }
  await sleep(5000);
  await close(s);
}

async function card(htmlFile, png) {
  const s = await open(null);
  await s.page.goto('file://' + path.resolve(htmlFile), { waitUntil: 'networkidle' });
  await s.page.evaluate(() => document.fonts.ready);
  await s.page.screenshot({ path: png });
  await close(s);
}

(async () => {
  if (mode === 'web') await web(args[0]);
  else if (mode === 'grafana') await grafana(...args);
  else if (mode === 'alert') await alert(...args);
  else if (mode === 'terminal') await terminal(...args);
  else if (mode === 'the') await card(...args);
  else throw new Error('Không rõ cảnh: ' + mode);
})().catch((e) => { console.error('LỖI', e.message); process.exit(1); });
