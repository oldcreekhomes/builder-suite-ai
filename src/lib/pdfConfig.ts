// Centralized PDF.js worker configuration
// This file must be imported early (in main.tsx) to configure PDF.js globally
// before any component attempts to load a PDF.

import { pdfjs } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Use unpkg CDN worker - recommended by react-pdf, directly mirrors npm packages
const workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Configure for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// Configure for direct pdfjs-dist usage (same worker, different import path)
GlobalWorkerOptions.workerSrc = workerSrc;

// Export for verification if needed
export const PDF_WORKER_CONFIGURED = true;
export { pdfjs };
