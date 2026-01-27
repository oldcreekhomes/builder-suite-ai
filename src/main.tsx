// [BOOT] Log at the very top before any imports to catch early failures
console.log("[BOOT] main.tsx loaded");

// Global error handlers to capture uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[GLOBAL ERROR]", { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = (event) => {
  console.error("[UNHANDLED PROMISE REJECTION]", event.reason);
};

import { createRoot } from "react-dom/client";
import "./lib/pdfConfig"; // Configure PDF.js worker globally before any component loads
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Simple fallback UI that doesn't depend on Tailwind
const RootErrorFallback = (
  <div style={{ 
    padding: '40px', 
    textAlign: 'center', 
    fontFamily: 'system-ui, sans-serif',
    color: '#333'
  }}>
    <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>Something went wrong</h1>
    <p style={{ marginBottom: '16px' }}>The application failed to load. Please try refreshing the page.</p>
    <button 
      onClick={() => window.location.reload()}
      style={{
        padding: '8px 16px',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      Refresh Page
    </button>
  </div>
);

console.log("[BOOT] About to render React app");

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallback={RootErrorFallback}>
    <ImpersonationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ImpersonationProvider>
  </ErrorBoundary>
);

console.log("[BOOT] React render called");
