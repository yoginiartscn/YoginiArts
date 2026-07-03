const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMsgs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => consoleMsgs.push(`[requestfailed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`));
  page.on('dialog', async d => { consoleMsgs.push(`[dialog:${d.type()}] ${d.message()}`); await d.dismiss(); });
  page.on('download', d => consoleMsgs.push(`[download] ${d.suggestedFilename()} from ${d.url()}`));
  page.on('frameattached', f => consoleMsgs.push(`[frameattached] ${f.name()}`));

  const responses = [];
  page.on('response', res => {
    responses.push(`${res.status()} ${res.url()}`);
  });

  const shotDir = __dirname + '/_tmp_shots';
  require('fs').mkdirSync(shotDir, { recursive: true });

  console.log('--- Navigating to login ---');
  await page.goto('https://yoginiarts.com/inventorymanagement/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: shotDir + '/01-login.png' });

  console.log('--- Filling login form ---');
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await emailInput.fill('admin@yoginiarts.com');
  await passInput.fill('admin123');
  await page.screenshot({ path: shotDir + '/02-filled.png' });

  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
  await page.screenshot({ path: shotDir + '/03-after-login.png' });
  console.log('Current URL after login:', page.url());

  if (page.url().includes('/login')) {
    console.log('LOGIN FAILED — still on login page. Body text snippet:');
    console.log((await page.textContent('body')).slice(0, 800));
    console.log('--- Console/network log ---');
    console.log(consoleMsgs.join('\n'));
    console.log('--- All responses ---');
    console.log(responses.join('\n'));
    await browser.close();
    process.exit(1);
  }

  console.log('--- Navigating to Products page ---');
  await page.goto('https://yoginiarts.com/inventorymanagement/products', { waitUntil: 'networkidle' });
  await page.screenshot({ path: shotDir + '/04-products.png' });

  console.log('--- Looking for Download Quotation button ---');
  const dqButton = page.locator('button:has-text("Download Quotation"), button:has-text("下载报价单")').first();
  await dqButton.waitFor({ state: 'visible', timeout: 15000 });
  await dqButton.click();
  await page.screenshot({ path: shotDir + '/05-quotation-modal.png' });

  console.log('--- Clicking Download Excel in modal ---');
  const modalDownloadBtn = page.locator('button:has-text("Download Excel")');

  const responsePromise = page.waitForResponse(res => res.url().includes('/reports/export/quotation'), { timeout: 15000 }).catch(e => null);
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(e => null);

  await modalDownloadBtn.click();
  await page.waitForTimeout(3000);

  // Inspect the hidden iframe's src directly
  const iframeSrc = await page.evaluate(() => document.getElementById('inv-download-iframe')?.src);
  console.log('IFRAME SRC:', iframeSrc);

  await page.waitForTimeout(3000);
  await page.screenshot({ path: shotDir + '/06-after-download-click.png' });

  const [quotationResponse, downloadEvent] = await Promise.all([responsePromise, downloadPromise]);
  if (downloadEvent) {
    console.log('DOWNLOAD EVENT:', downloadEvent.suggestedFilename(), downloadEvent.url());
  }
  if (quotationResponse) {
    console.log('QUOTATION RESPONSE:', quotationResponse.status(), quotationResponse.url());
    console.log('Headers:', JSON.stringify(quotationResponse.headers(), null, 2));
    if (quotationResponse.status() >= 400) {
      try {
        const body = await quotationResponse.text();
        console.log('BODY:', body.slice(0, 1000));
      } catch (e) { console.log('Could not read body:', e.message); }
    }
  } else {
    console.log('NO RESPONSE CAPTURED for /reports/export/quotation within timeout');
  }

  // Directly hit the iframe URL via API request context to see the raw HTTP result
  if (iframeSrc) {
    console.log('--- Direct fetch of iframe URL via request context ---');
    try {
      const direct = await context.request.get(iframeSrc);
      console.log('DIRECT STATUS:', direct.status());
      console.log('DIRECT HEADERS:', JSON.stringify(direct.headers(), null, 2));
      if (direct.status() >= 400) {
        console.log('DIRECT BODY:', (await direct.text()).slice(0, 1000));
      } else {
        const buf = await direct.body();
        console.log('DIRECT BODY SIZE:', buf.length, 'bytes');
      }
    } catch (e) {
      console.log('DIRECT FETCH ERROR:', e.message);
    }
  }

  console.log('--- Full console/network log ---');
  console.log(consoleMsgs.join('\n'));
  console.log('--- API responses seen ---');
  console.log(responses.join('\n'));

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
