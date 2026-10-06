// Centralized PDF.js configuration. Workers are self-hosted in /public/pdfjs/<version>/
// so they always match the API version and never depend on a CDN.
import { pdfjs } from 'react-pdf';
import { GlobalWorkerOptions, version as distVersion } from 'pdfjs-dist';

const workerVersion = pdfjs.version;
export const PDF_WORKER_SRC = `/pdfjs/${workerVersion}/pdf.worker.min.mjs`;
const distWorkerSrc = `/pdfjs/${distVersion}/pdf.worker.min.mjs`;

/** Re-apply worker config; react-pdf may reset it when its chunk loads lazily. */
export function ensurePdfWorker() {
  if (pdfjs.GlobalWorkerOptions.workerSrc !== PDF_WORKER_SRC) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }
  if (GlobalWorkerOptions !== pdfjs.GlobalWorkerOptions && GlobalWorkerOptions.workerSrc !== distWorkerSrc) {
    GlobalWorkerOptions.workerSrc = distWorkerSrc;
  }
}

ensurePdfWorker();

export const PDF_WORKER_CONFIGURED = true;
export const PDF_VERSION = workerVersion;
export { pdfjs };
