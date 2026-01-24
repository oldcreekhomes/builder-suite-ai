// Centralized PDF.js worker configuration
// This file must be imported early (in main.tsx) to configure PDF.js globally
// before any component attempts to load a PDF.

import { pdfjs } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Import worker locally - Vite bundles it with the app
// This prevents ad-blockers, firewalls, and privacy extensions from blocking the worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Configure for direct pdfjs-dist usage (SimplifiedAIBillExtraction, etc.)
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Export for verification if needed
export const PDF_WORKER_CONFIGURED = true;
export { pdfjs };
