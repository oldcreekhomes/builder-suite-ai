
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth";
import { useBrowserTitle } from "./hooks/useBrowserTitle";

const AppWithTitle = () => {
  useBrowserTitle();
  return <App />;
};

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
    <AuthProvider>
      <AppWithTitle />
    </AuthProvider>
  // </StrictMode>
);
