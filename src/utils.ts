import puppeteer, { Browser, Page } from 'puppeteer';
import OpenAI from 'openai';
import { COMPLIANCE_GUIDELINES } from './base';


/**
 * A global Browser instance (reused for all requests).
 */
let browser: Browser | null = null;

/**
 * Clean text by normalizing whitespace, etc.
 */
const cleanWebpageContent = (rawText: string) => {
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
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
        const cleaned = cleanWebpageContent(rawText);

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


/**
 * Generate a prompt for the OpenAI API.
 * @param webpageContent - The content of the webpage.
 * @returns - The prompt for the OpenAI API.
 */
export const generatePrompt = (webpageContent: string) => {
    const prompt = `
        You are an AI compliance assistant. Your task is to identify only the terms or phrases in the following webpage content that violate or potentially violate the provided compliance policy. However, you must carefully check for any disclaimers or partial compliance statements before you classify something as non-compliant.

        ## Compliance Policy
        ${COMPLIANCE_GUIDELINES}

        ## Webpage Content
        ${webpageContent}

        ### Requirements:
        1. Only flag terms or phrases that **appear verbatim** (or extremely close matches) in the webpage content.
        2. **Check for disclaimers or partial compliance statements** that might mitigate or satisfy the policy requirements.  
        - If a relevant disclaimer exists and is **adequate** according to the policy, do **not** label the term as fully non-compliant.  
        - If the disclaimer **partially** meets the policy but is missing certain elements, mark it as “partially compliant,” and specify what's missing.
        - If there is **no** disclaimer or it's **completely inadequate**, mark it as “non-compliant.”
        3. For each flagged term, provide:
        - The **exact text** from the webpage (quote it directly).
        - A classification: "compliance_status": "non-compliant" | "partially compliant".
        - **Why** it's classified that way (reference the policy).
        - **Suggestions** (policy-compliant alternatives or additional disclaimers needed).
        4. Return a **structured JSON** object with the following format:

        json
        {
        "findings": [
            {
            "term_or_phrase": "<exact text>",
            "compliance_status": "non-compliant" | "partially-compliant",
            "explanation": "Brief explanation referencing the relevant policy guideline and any disclaimers found.",
            "suggestions": "Suggested replacement or additional disclaimers needed."
            },
            ...
        ]
        }
    `;

    return prompt;
}

/**
 * Clean the compliance response from the OpenAI API.
 * @param rawResponse - The raw response from the OpenAI API.
 * @returns - The cleaned JSON object.
 */
export const cleanComplianceResponse = (rawResponse: string) => {
    const jsonString = rawResponse.replace(/```json|```/g, '').trim();

    try {
        // Parse the cleaned JSON string
        const parsedJSON = JSON.parse(jsonString);
        return parsedJSON;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('Invalid JSON response');
    }
};


/**
 * Check the compliance of the webpage against the compliance policy.
 * @param prompt - The prompt for the OpenAI API.
 * @returns - The compliance of the webpage.
 */
export const checkCompliance = async (prompt: string) => {
    const client = new OpenAI({
        apiKey: process.env['OPEN_AI_KEY'], // This is the default and can be omitted
    });

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'user', content: prompt },
        ],
    });

    return cleanComplianceResponse(response.choices[0].message.content || '');
}
