
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeSyncfusion } from "./utils/syncfusionLicense";
import { AuthProvider } from "./hooks/useAuth";

// Initialize Syncfusion license
initializeSyncfusion();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
