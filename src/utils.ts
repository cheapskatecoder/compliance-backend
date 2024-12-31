import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * A global Browser instance (reused for all requests).
 */
let browser: Browser | null = null;

/**
 * Clean text by normalizing whitespace, etc.
 */
const cleanText = (rawText: string) => {
    return rawText
        // Replace multiple newlines with a single newline
        .replace(/\n{2,}/g, '\n')
        // Replace sequences of whitespace with a single space
        .replace(/\s+/g, ' ')
        // Preserve paragraph structure (split sentences into paragraphs)
        .replace(/([.!?])\s+/g, '$1\n')
        // Remove repetitive numbers or fragments
        .replace(/\b(\d{1,2}\s?){3,}\b/g, '')
        // Remove non-printable characters
        .replace(/[\t\r]/g, '')
        // Trim leading/trailing whitespace
        .trim();
}

/**
 * Initialize (or reuse) a single headless Browser instance.
 */
async function initBrowser() {
  if (!browser) {
    console.log('Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true, // or "new" if you want Puppeteer 19+ "headless" mode
    });
    console.log('Browser launched.');
  }
  return browser;
}

/**
 * Close the browser when you're done or at app shutdown.
 */
export async function closeBrowser() {
  if (browser) {
    console.log('Closing browser...');
    await browser.close();
    browser = null;
  }
}

/**
 * Block resource types you don't need (e.g., images, fonts, stylesheets).
 * Also optionally block analytics/tracking domains to save on time.
 */
function setupRequestInterception(page: Page) {
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    const url = req.url();

    const blockedDomains = ['google-analytics.com', 'doubleclick.net', 'facebook.net'];

    if (
      ['image', 'stylesheet', 'font', 'media'].includes(resourceType) ||
      blockedDomains.some(domain => url.includes(domain))
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

/**
 * Get rendered text from the given URL by:
 * - Reusing a single browser
 * - Opening a new page
 * - Blocking unnecessary resources
 * - Setting a custom user agent
 * - Extracting text from the DOM
 * - Cleaning the text
 */
export async function getRenderedText(url: string): Promise<string> {
  let page: Page | null = null;

  try {
    const theBrowser = await initBrowser();
    console.log(`Creating new page for URL: ${url}`);
    page = await theBrowser.newPage();

    // 1) Set up request interception (must be enabled before goto)
    await page.setRequestInterception(true);
    setupRequestInterception(page);

    // 2) Set a custom User-Agent to appear more like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    // 3) Optionally set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      // Add more headers if needed
    });

    console.log(`Navigating to: ${url}`);
    // 4) Use a shorter waitUntil if you only need DOM (not all JS requests):
    await page.goto(url, {
      waitUntil: 'domcontentloaded', 
      timeout: 15000,
    });

    console.log(`Extracting text content...`);
    const rawText = await page.evaluate(() => document.body.innerText || '');

    console.log('Cleaning text...');
    const cleaned = cleanText(rawText);

    console.log(`Finished fetching URL: ${url} (text length: ${cleaned.length})`);
    return cleaned;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  } finally {
    // Close the page but NOT the browser (so we can reuse it)
    if (page) {
      await page.close();
      console.log(`Closed page for: ${url}`);
    }
  }
}
