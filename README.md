# Compliance Checker API

## TL;DR
This project provides a Node.js/TypeScript API that:
- Accepts a webpage URL as input.
- Checks the webpage content against a compliance policy.
- Returns a structured response of non-compliant findings.

Technologies: Node.js, TypeScript, Express, Puppeteer, and OpenAI.

---

## Features
1. **Webpage Content Extraction**: Uses Puppeteer to render and extract text content from a given URL.
2. **Compliance Analysis**: Leverages OpenAI’s API to compare the extracted content against [Stripe's compliance guidelines](https://docs.stripe.com/treasury/marketing-treasury).
3. **Results in JSON**: Returns findings in a structured JSON format with detailed explanations and suggestions for each non-compliant term.
4. **Reusable Browser**: Optimized Puppeteer setup to reduce overhead by reusing browser instances.
5. **Request Validation**: Validates input URLs to ensure correctness and avoid misuse.

---

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- OpenAI API Key

### Steps
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd compliance-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Set up environment variables by creating a `.env` file:
   ```env
   OPEN_AI_KEY=your_openai_api_key
   PORT=3000
   ```
4. Start the server:
   ```bash
   npm start
   # or
   yarn start
   ```

---

## API Endpoints

### **POST /api/check-compliance**
Checks a webpage for compliance violations.

#### Request Body
```json
{
  "url": "https://example.com"
}
```

#### Response Example
```json
{
  "findings": [
    {
      "term_or_phrase": "bank account",
      "compliance_status": "non-compliant",
      "explanation": "The term 'bank account' is restricted for use only by licensed banks.",
      "suggestions": "Use 'financial account' or 'stored-value account' instead."
    }
  ]
}
```

#### Error Responses
- **400 Bad Request**: Invalid or missing URL.
- **500 Internal Server Error**: Issues with webpage rendering or compliance check.

---

## Code Structure

### **`index.ts`**
- Entry point of the application.
- Sets up the Express server and routes.

### **`api.ts`**
- Contains API route logic for checking compliance.
- Validates inputs and coordinates webpage rendering and compliance checks.

### **`utils.ts`**
- Includes utility functions for:
  - Initializing Puppeteer.
  - Rendering webpage content.
  - Generating prompts for OpenAI.
  - Cleaning and formatting OpenAI responses.

### **`base.ts`**
- Contains compliance guidelines used to evaluate webpage content.

---

## Development

### Running Locally
1. Start the server:
   ```bash
   npm run dev
   ```
2. Use a tool like Postman or curl to test the `/api/check-compliance` endpoint.

### Testing
Add unit tests for core utilities and API routes:
```bash
npm test
```

### Linting
Ensure code quality using ESLint:
```bash
npm run lint
```

---

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```
2. Deploy the `dist` folder to your server or hosting platform.
3. Use Docker for containerized deployments (optional).

---

## Environment Variables
| Variable       | Description                  |
|----------------|------------------------------|
| `OPEN_AI_KEY`  | OpenAI API key for GPT calls |
| `PORT`         | Port for running the server  |

---

## Potential Improvements
- Add rate limiting to prevent abuse.
- Enhance testing coverage with mocks for Puppeteer and OpenAI.
- Optimize Puppeteer for heavy workloads (e.g., use a pool of page instances).
- Implement caching for compliance results to reduce redundant API calls.

---

## License
MIT License. See [LICENSE](./LICENSE) for more details.

---

## Contact
For issues or feature requests, create an issue in the repository or contact the maintainer directly.
