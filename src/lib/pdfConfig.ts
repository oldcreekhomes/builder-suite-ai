// Centralized PDF.js configuration
// This file must be imported in main.tsx BEFORE any PDF components are used
// to ensure the worker is configured globally.

import { pdfjs } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// CRITICAL: Use the exact version from react-pdf to prevent API/Worker version mismatch
// react-pdf exports pdfjs.version which tells us exactly what version it needs
const workerVersion = pdfjs.version;

// Use unpkg CDN with the EXACT version that react-pdf's pdfjs expects
// This ensures API version === Worker version
const workerSrc = `//unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`;

// Configure for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// Configure for direct pdfjs-dist usage (SimplifiedAIBillExtraction, etc.)
GlobalWorkerOptions.workerSrc = workerSrc;

// Log version for debugging
console.log(`PDF.js configured: API v${pdfjs.version}, Worker v${workerVersion}`);

// Export for verification if needed
export const PDF_WORKER_CONFIGURED = true;
export const PDF_VERSION = workerVersion;
export { pdfjs };
