// 把 index.html 导出为 A4 PDF：node scripts/make-pdf.js
// 依赖 Playwright（npm i -D playwright 或全局安装）。
// 网络受代理限制时，字体请求改由 curl 代取（curl 会读取系统 CA 配置）。
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'AI-2028-Map.pdf');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: 'light' });
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    const url = route.request().url();
    try {
      const body = execFileSync('curl', ['-sSL', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 });
      const type = url.includes('googleapis') ? 'text/css' : 'font/woff2';
      await route.fulfill({ status: 200, body, headers: { 'content-type': type, 'access-control-allow-origin': '*' } });
    } catch (e) {
      await route.abort();
    }
  });
  await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#6b7782;padding:0 12mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>AI 2028 地图 · v1.0 · 2026.10</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  console.log('PDF 已生成：' + out);
})();
