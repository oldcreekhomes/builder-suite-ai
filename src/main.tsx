
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
    <ImpersonationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ImpersonationProvider>
  // </StrictMode>
);
