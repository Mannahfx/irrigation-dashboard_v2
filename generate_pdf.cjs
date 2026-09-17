const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: 'new'
    });
    const page = await browser.newPage();
    const html = fs.readFileSync('C:\\Users\\DOMINION\\Desktop\\manna-irrigation-dashboard-v2\\bom.html', 'utf8');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ 
        path: 'C:\\Users\\DOMINION\\Desktop\\manna-irrigation-dashboard-v2\\RevoSmart_Irrigation_BOM.pdf', 
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    await browser.close();
    console.log('PDF generated successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
})();
