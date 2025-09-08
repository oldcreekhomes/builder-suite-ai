
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth";
import { useBrowserTitle } from "./hooks/useBrowserTitle";
import { useGlobalChatNotifications } from "./hooks/useGlobalChatNotifications";
import { useFloatingChat } from "./components/chat/FloatingChatManager";

const AppWithTitle = () => {
  useBrowserTitle();
  const { openFloatingChat } = useFloatingChat();
  
  // Set up global notifications with floating chat integration
  useGlobalChatNotifications(null, openFloatingChat);
  
  return <App />;
};

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
    <AuthProvider>
      <AppWithTitle />
    </AuthProvider>
  // </StrictMode>
);
